import crypto from 'crypto';
import { createServiceClient } from './supabase';

const SM8_BASE_URL = 'https://api.servicem8.com/api_1.0';

// Encryption helpers for OAuth tokens stored in DB
const ALGO = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const hex = process.env.SM8_TOKEN_ENCRYPTION_KEY!;
  return Buffer.from(hex, 'hex');
}

function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptToken(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, getEncryptionKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// Rate limiter — enforces minimum 400ms between SM8 API calls (~150 req/min, safe under 180 limit)
let lastCallAt = 0;
async function enforceRateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < 400) {
    await new Promise((r) => setTimeout(r, 400 - elapsed));
  }
  lastCallAt = Date.now();
}

// ─────────────────────────────────────────────────────────────
// SM8 Client Class
// ─────────────────────────────────────────────────────────────

export class SM8Client {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SM8_API_KEY!;
  }

  // All GET requests use API key auth (Basic)
  private async readRequest<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    await enforceRateLimit();

    const url = new URL(`${SM8_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const credentials = Buffer.from(`${this.apiKey}:`).toString('base64');
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SM8 GET ${endpoint} failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // All POST/PATCH requests — tries OAuth token first, falls back to API key Basic Auth.
  // Returns the x-record-uuid header (SM8 POSTs return the new record UUID there, not in body).
  private async writeRequest(
    endpoint: string,
    data: object,
    method: 'POST' | 'PATCH' = 'POST'
  ): Promise<{ uuid: string }> {
    await enforceRateLimit();

    // Try OAuth if tokens are configured; otherwise use API key (Basic Auth).
    // SM8 accepts Basic Auth for write endpoints just like read endpoints.
    let authHeader: string;
    try {
      const accessToken = await this.getValidAccessToken();
      authHeader = `Bearer ${accessToken}`;
    } catch {
      // No OAuth tokens — fall back to API key Basic Auth
      const credentials = Buffer.from(`${this.apiKey}:`).toString('base64');
      authHeader = `Basic ${credentials}`;
    }

    const response = await fetch(`${SM8_BASE_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SM8 ${method} ${endpoint} failed: ${response.status} ${response.statusText} — ${body}`
      );
    }

    // SM8 returns the new record UUID in the x-record-uuid response header
    const uuid = response.headers.get('x-record-uuid') ?? '';
    return { uuid };
  }

  // ── Token management ──────────────────────────────────────

  private async getValidAccessToken(): Promise<string> {
    const supabase = createServiceClient();
    const { data: rows } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', [
        'sm8_oauth_access_token',
        'sm8_oauth_refresh_token',
        'sm8_oauth_token_expires_at',
      ]);

    if (!rows || rows.length < 3) {
      throw new Error('SM8 OAuth tokens not configured. Visit /settings to connect SM8.');
    }

    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const encryptedAccess = byKey['sm8_oauth_access_token'];
    const encryptedRefresh = byKey['sm8_oauth_refresh_token'];
    const expiresAt = byKey['sm8_oauth_token_expires_at'];

    if (!encryptedAccess || !encryptedRefresh) {
      throw new Error('SM8 OAuth not set up. Visit Settings → Connect SM8.');
    }

    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
    const fiveMinutesMs = 5 * 60 * 1000;

    if (Date.now() + fiveMinutesMs >= expiresAtMs) {
      return this.refreshAccessToken(decryptToken(encryptedRefresh));
    }

    return decryptToken(encryptedAccess);
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://go.servicem8.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SM8_CLIENT_ID!,
        client_secret: process.env.SM8_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error(`SM8 token refresh failed: ${response.status}`);
    }

    const tokens = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const supabase = createServiceClient();

    await supabase.from('settings').upsert([
      { key: 'sm8_oauth_access_token', value: encryptToken(tokens.access_token) },
      { key: 'sm8_oauth_refresh_token', value: encryptToken(tokens.refresh_token) },
      { key: 'sm8_oauth_token_expires_at', value: expiresAt },
    ], { onConflict: 'key' });

    return tokens.access_token;
  }

  // Store new tokens after initial OAuth code exchange
  async storeTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const supabase = createServiceClient();

    await supabase.from('settings').upsert([
      { key: 'sm8_oauth_access_token', value: encryptToken(accessToken) },
      { key: 'sm8_oauth_refresh_token', value: encryptToken(refreshToken) },
      { key: 'sm8_oauth_token_expires_at', value: expiresAt },
    ], { onConflict: 'key' });
  }

  async getTokenStatus(): Promise<{ connected: boolean; expiresAt: string | null }> {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', ['sm8_oauth_access_token', 'sm8_oauth_token_expires_at']);

    const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const hasToken = !!byKey['sm8_oauth_access_token'];
    const expiresAt = byKey['sm8_oauth_token_expires_at'] || null;

    return { connected: hasToken, expiresAt };
  }

  // ── READ endpoints ─────────────────────────────────────────

  async getClients(page = 1): Promise<SM8Client[]> {
    return this.readRequest<SM8Client[]>('/client.json', {
      '$top': '500',
      '$skip': String((page - 1) * 500),
    });
  }

  async getJobs(filter?: string): Promise<SM8Job[]> {
    const params: Record<string, string> = {};
    if (filter) params['$filter'] = filter;
    return this.readRequest<SM8Job[]>('/job.json', params);
  }

  async getInvoices(): Promise<SM8Invoice[]> {
    return this.readRequest<SM8Invoice[]>('/invoice.json');
  }

  async getStaff(): Promise<SM8Staff[]> {
    return this.readRequest<SM8Staff[]>('/staff.json');
  }

  async getClientCategories(): Promise<SM8Category[]> {
    return this.readRequest<SM8Category[]>('/clientcategory.json');
  }

  async getJobActivities(jobUuid: string): Promise<SM8JobActivity[]> {
    return this.readRequest<SM8JobActivity[]>(`/job/${jobUuid}/jobactivity.json`);
  }

  // ── WRITE endpoints ────────────────────────────────────────

  async createClient(data: SM8CreateClientInput): Promise<{ uuid: string }> {
    return this.writeRequest('/client.json', data);
  }

  async createJob(data: SM8CreateJobInput): Promise<{ uuid: string }> {
    return this.writeRequest('/job.json', data);
  }

  async addClientToCategory(categoryUuid: string, clientUuid: string): Promise<void> {
    await this.writeRequest(`/clientcategory/${categoryUuid}/clients.json`, { uuid: clientUuid });
  }
}

// Singleton instance for use in API routes and cron jobs
export const sm8 = new SM8Client();

// ─────────────────────────────────────────────────────────────
// SM8 API Type Shapes (what the SM8 API actually returns)
// ─────────────────────────────────────────────────────────────

export interface SM8Client {
  uuid: string;
  name: string;
  phone: string;
  email: string;
  billing_address: string;
  billing_suburb: string;
  billing_postcode: string;
  category_uuids?: string;
}

export interface SM8Job {
  uuid: string;
  job_address: string;
  company_uuid: string;
  status: string;
  job_date: string;
  total_excluding_tax?: number;
  payment_status?: string;
  generated_job_id?: string;
  type?: string;
  note?: string;
  created_at?: string;
}

export interface SM8Invoice {
  uuid: string;
  job_uuid: string;
  status: string;
  amount: number;
  created_at: string;
}

export interface SM8Staff {
  uuid: string;
  first: string;
  last: string;
  email: string;
}

export interface SM8Category {
  uuid: string;
  name: string;
  type?: string;
}

export interface SM8JobActivity {
  uuid: string;
  created_at: string;
  activity_was: string;
  note?: string;
}

export interface SM8CreateClientInput {
  name: string;
  phone?: string;
  email?: string;
  billing_address?: string;
  billing_suburb?: string;
  billing_postcode?: string;
}

export interface SM8CreateJobInput {
  company_uuid: string;
  status?: string;
  type?: string;
  note?: string;
  job_address?: string;
  job_suburb?: string;
  job_postcode?: string;
}

// ─────────────────────────────────────────────────────────────
// OAuth helpers (used by /api/auth/sm8 routes)
// ─────────────────────────────────────────────────────────────

export function buildSM8AuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SM8_CLIENT_ID!,
    redirect_uri: process.env.SM8_OAUTH_REDIRECT_URI!,
    state,
    scope: 'read_clients write_clients read_jobs write_jobs read_staff',
  });
  return `https://go.servicem8.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch('https://go.servicem8.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SM8_CLIENT_ID!,
      client_secret: process.env.SM8_CLIENT_SECRET!,
      redirect_uri: process.env.SM8_OAUTH_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    throw new Error(`SM8 code exchange failed: ${response.status}`);
  }

  return response.json();
}
