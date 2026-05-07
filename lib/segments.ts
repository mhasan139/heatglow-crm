import { createServiceClient } from './supabase';
import type { SegmentFilter } from '@/types/index';

export type { SegmentFilter };

// Resolves segment filters into an array of matching client IDs
export async function resolveSegment(filters: SegmentFilter[]): Promise<number[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from('clients')
    .select('id')
    .is('deleted_at', null);

  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        query = query.eq(field, value);
        break;
      case 'neq':
        query = query.neq(field, value);
        break;
      case 'gt':
        query = query.gt(field, value);
        break;
      case 'lt':
        query = query.lt(field, value);
        break;
      case 'gte':
        query = query.gte(field, value);
        break;
      case 'lte':
        query = query.lte(field, value);
        break;
      case 'in':
        if (Array.isArray(value)) {
          query = query.in(field, value);
        }
        break;
      case 'contains':
        query = query.ilike(field, `%${value}%`);
        break;
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: { id: number }) => r.id);
}

// Returns count only (for live preview)
export async function countSegment(filters: SegmentFilter[]): Promise<number> {
  const supabase = createServiceClient();
  let query = supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        query = query.eq(field, value);
        break;
      case 'neq':
        query = query.neq(field, value);
        break;
      case 'gt':
        query = query.gt(field, value);
        break;
      case 'lt':
        query = query.lt(field, value);
        break;
      case 'gte':
        query = query.gte(field, value);
        break;
      case 'lte':
        query = query.lte(field, value);
        break;
      case 'in':
        if (Array.isArray(value)) {
          query = query.in(field, value);
        }
        break;
      case 'contains':
        query = query.ilike(field, `%${value}%`);
        break;
    }
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// Fetch suppressed emails for filtering
export async function getSuppressedEmails(): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('suppression_list')
    .select('email');
  return new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase()));
}

// Build personalised email body by replacing merge tags
export function personaliseEmail(template: string, client: {
  name: string;
  email: string | null;
  last_job_date?: string | null;
}): string {
  const firstName = client.name.split(' ')[0];
  const lastName = client.name.split(' ').slice(1).join(' ');
  return template
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{last_name\}/g, lastName)
    .replace(/\{last_job_date\}/g, client.last_job_date ?? '—')
    .replace(/\{renewal_date\}/g, '—')
    .replace(/\{quote_ref\}/g, '—')
    .replace(/\{last_job_type\}/g, '—');
}

// Add unsubscribe footer to email HTML
export function wrapWithUnsubscribe(html: string, email: string): string {
  const encoded = encodeURIComponent(email);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.heatglow.co.uk';
  const unsubUrl = `${baseUrl}/api/webhooks/unsubscribe?email=${encoded}`;
  return `${html}
<div style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#9ca3af;text-align:center;">
  <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
</div>`;
}
