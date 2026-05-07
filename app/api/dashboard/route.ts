import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformEnquiry } from '@/lib/django';
import type { DashboardResponse } from '@/types/index';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/dashboard/');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message ?? 'Failed to load dashboard' }, { status: res.status });
  }

  const json = await res.json();
  const d = json.data;

  // Transform recent jobs: job_id → id already done by Django, map client name for display
  const recentJobs = (d.recent_jobs ?? []).map((j: Record<string, unknown>) => ({
    id: j.id,
    job_ref: j.job_ref ?? null,
    client_id: j.client_id ?? null,
    client_name: j.client_name ?? null,
    sm8_job_uuid: null,
    sm8_client_uuid: null,
    job_type: j.job_type ?? null,
    sm8_status: j.sm8_status ?? null,
    invoice_status: j.invoice_status ?? null,
    invoice_amount: j.invoice_amount ?? null,
    invoice_created_at: null,
    completed_by_uuid: null,
    engineer_name: j.engineer_name ?? null,
    job_date: j.job_date ?? null,
    description: null,
    quote_lapsed: j.quote_lapsed ?? false,
    quote_lapsed_checked_at: null,
    sm8_job_url: null,
    last_synced_at: null,
    deleted_at: null,
  }));

  const response: DashboardResponse = {
    kpis: d.kpis,
    alerts: d.alerts,
    quote_funnel: d.quote_funnel ?? [],
    enquiry_quality: d.enquiry_quality,
    recent_enquiries: (d.recent_enquiries ?? []).map(transformEnquiry) as DashboardResponse['recent_enquiries'],
    recent_activity: (d.recent_activity ?? []).map((a: Record<string, unknown>) => ({
      id: a.id,
      created_at: a.created_at,
      event_type: a.event_type,
      description: a.description,
      actor: a.actor ?? null,
      metadata: null,
      entity_type: a.entity_type ?? null,
      entity_id: a.entity_id ?? null,
    })) as DashboardResponse['recent_activity'],
    recent_jobs: recentJobs as DashboardResponse['recent_jobs'],
    last_sync: {
      synced_at: (d.last_sync?.synced_at as string | null) ?? null,
      status: (d.last_sync?.status as DashboardResponse['last_sync']['status']) ?? null,
    },
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  });
}
