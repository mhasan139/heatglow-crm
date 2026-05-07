// Switch backend by setting DJANGO_BACKEND in .env. Accepts either:
//   - a keyword: "local" | "live"
//   - a full URL: "https://teamerror.cloud" / "http://192.168.x.x:8002"
// DJANGO_API_URL is still honoured as an explicit override.

// Resolve the host where local Django can be reached. Under WSL2 NAT mode,
// /etc/resolv.conf's `nameserver` line is the Windows host IP — and that's
// the only address that actually reaches Windows-hosted services from WSL.
// On Windows / native Linux this read fails harmlessly and we fall back to
// 127.0.0.1, which works there.
function resolveLocalDjangoHost(): string {
  try {
    // This resolv.conf trick only works on WSL2 (Linux), where the nameserver
    // is the Windows host IP. On macOS /etc/resolv.conf exists but its
    // nameserver is the router — using it would point at the wrong host.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const isWSL = fs.existsSync('/proc/version') &&
      fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
    if (isWSL) {
      const resolv = fs.readFileSync('/etc/resolv.conf', 'utf8');
      const m = resolv.match(/^\s*nameserver\s+(\d+\.\d+\.\d+\.\d+)/m);
      if (m) return m[1];
    }
  } catch {
    // not in WSL/Linux, or file unreadable — fall through
  }
  return '127.0.0.1';
}

const BACKENDS: Record<string, string> = {
  local: `http://${resolveLocalDjangoHost()}:8000`,
  live: 'https://teamerror.cloud',
};

const target = process.env.DJANGO_BACKEND ?? 'local';
const DJANGO_API_URL = process.env.DJANGO_API_URL || BACKENDS[target] || target;
const DJANGO_SERVICE_TOKEN = process.env.DJANGO_SERVICE_TOKEN || 'heatglow-dev-token';

export async function djangoFetch(path: string, options: RequestInit = {}) {
  const url = `${DJANGO_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Token': DJANGO_SERVICE_TOKEN,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

// ── Field transformers ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformClient(c: any) {
  return {
    id: c.client_id,
    sm8_client_uuid: c.sm8_client_uuid ?? null,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    postcode: c.postcode ?? null,
    address_line1: null,
    address_line2: null,
    city: null,
    is_heatshield: c.is_heatshield ?? false,
    heatshield_category_uuid: null,
    customer_since: c.created_at ?? null,
    total_spend: parseFloat(c.total_spend ?? '0'),
    job_count: c.job_count ?? 0,
    known_contacts: c.known_contacts ?? [],
    last_job_date: c.last_job_date ?? null,
    last_synced_at: null,
    deleted_at: null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformJob(j: any) {
  return {
    id: j.job_id,
    sm8_job_uuid: j.sm8_job_uuid ?? null,
    client_id: j.client ?? null,
    sm8_client_uuid: null,
    job_ref: j.job_ref ?? null,
    job_type: j.job_description ?? null,
    sm8_status: j.sm8_status ?? null,
    invoice_status: j.invoice_status ?? null,
    invoice_amount: parseFloat(j.invoice_amount ?? '0'),
    invoice_created_at: j.created_at ?? null,
    completed_by_uuid: null,
    engineer_name: j.engineer_name ?? null,
    job_date: j.job_date ?? null,
    description: j.job_description ?? null,
    quote_lapsed: j.quote_lapsed ?? false,
    quote_lapsed_checked_at: null,
    sm8_job_url: null,
    last_synced_at: null,
    deleted_at: null,
  };
}

const AI_REC_MAP: Record<string, string> = {
  AUTO_QUALIFY: 'QUALIFY',
  AUTO_REJECT: 'REJECT',
  HUMAN_REVIEW: 'REVIEW',
};

const STATUS_MAP: Record<string, string> = {
  Approved: 'Qualified',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformEnquiry(e: any) {
  const status = STATUS_MAP[e.status] ?? e.status;
  const aiRec = e.ai_recommendation ? (AI_REC_MAP[e.ai_recommendation] ?? e.ai_recommendation) : null;
  return {
    id: e.enquiry_id,
    created_at: e.created_at,
    customer_name: e.customer_name,
    phone: e.phone,
    email: e.email ?? '',
    postcode: e.postcode,
    postcode_covered: null,
    job_type: e.job_type ?? '',
    job_type_accepted: null,
    urgency: e.urgency,
    source: e.source ?? null,
    referral_name: e.referral_name ?? null,
    description: e.description ?? '',
    internal_notes: e.override_note ?? null,
    is_duplicate: false,
    is_suspicious: false,
    recaptcha_score: e.recaptcha_score ?? null,
    ai_score: e.ai_score ?? null,
    ai_recommendation: aiRec,
    ai_confidence: e.ai_confidence ?? null,
    ai_reason: e.ai_reason ?? null,
    ai_flags: e.ai_flags ?? null,
    ai_scored_at: null,
    ai_error: false,
    auto_reject_reason: null,
    status,
    qualified_by: null,
    qualified_at: status === 'Qualified' ? e.reviewed_at : null,
    rejected_by: null,
    rejected_at: status === 'Rejected' ? e.reviewed_at : null,
    rejection_reason: e.override_note ?? null,
    override_note: e.override_note ?? null,
    sm8_client_uuid: e.sm8_client_uuid ?? null,
    sm8_job_uuid: e.sm8_job_uuid ?? null,
    sm8_push_status: e.sm8_push_status?.toLowerCase() ?? null,
    sm8_push_attempted_at: null,
    sm8_push_attempt_count: e.sm8_push_attempts ?? 0,
    existing_client_id: e.matched_client ?? null,
    customer_email_sent: false,
    customer_email_type: null,
    gareth_email_sent: false,
    expired_at: null,
    deleted_at: null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformHeatShieldMember(m: any) {
  const monthlyPence = Math.round(parseFloat(m.monthly_amount ?? '0') * 100);
  // List serializer uses flat fields; detail serializer uses nested client object
  const c = m.client ?? {};
  const clientName = m.client_name ?? c.name ?? '';
  const clientPhone = m.client_phone ?? c.phone ?? null;
  const clientEmail = m.client_email ?? c.email ?? null;
  const clientPostcode = m.client_postcode ?? c.postcode ?? null;
  const clientId = m.client_id ?? c.client_id ?? null;
  const clientSm8Uuid = m.client_sm8_uuid ?? c.sm8_client_uuid ?? '';
  return {
    id: m.member_id,
    client_id: clientId,
    sm8_client_uuid: clientSm8Uuid,
    customer_name: clientName,
    sign_up_date: m.created_at ? m.created_at.split('T')[0] : '',
    last_service_date: m.last_service_date ?? '',
    monthly_amount_pence: monthlyPence,
    status: m.status,
    cancellation_reason: m.cancel_reason ?? null,
    cancellation_date: m.cancelled_at ? m.cancelled_at.split('T')[0] : null,
    notes: m.notes ?? null,
    service_due_flag: m.service_due_flag ?? false,
    reminder_draft_created_at: m.reminder_draft_created_at ?? null,
    deleted_at: null,
    clients: {
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      postcode: clientPostcode,
    },
  };
}
