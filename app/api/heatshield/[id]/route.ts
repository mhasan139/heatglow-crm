import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformHeatShieldMember } from '@/lib/django';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = parseInt(id);
  if (isNaN(memberId)) return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch(`/api/v1/heatshield/${memberId}/`);
  if (!res.ok) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const json = await res.json();
  const member = transformHeatShieldMember(json.data);

  // Fetch client's service job history
  let jobs: unknown[] = [];
  if (member.client_id) {
    const jobsRes = await djangoFetch(`/api/v1/clients/${member.client_id}/jobs/?page_size=20`);
    if (jobsRes.ok) {
      const jobsJson = await jobsRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jobs = (jobsJson.data ?? []).map((j: any) => ({
        id: j.job_id,
        job_ref: j.job_ref ?? '',
        job_type: j.job_description?.slice(0, 40) ?? '',
        description: j.job_description ?? '',
        sm8_status: j.sm8_status,
        invoice_status: j.invoice_status,
        invoice_amount: parseFloat(j.invoice_amount ?? '0'),
        job_date: j.job_date ?? null,
      }));
    }
  }

  return NextResponse.json({ member, jobs });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = parseInt(id);
  if (isNaN(memberId)) return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    last_service_date?: string;
    monthly_amount_pence?: number;
    notes?: string;
    status?: string;
  } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const djangoBody: Record<string, unknown> = {};
  if (body.last_service_date !== undefined) djangoBody.last_service_date = body.last_service_date;
  if (body.monthly_amount_pence !== undefined) djangoBody.monthly_amount = (body.monthly_amount_pence / 100).toFixed(2);
  if (body.notes !== undefined) djangoBody.notes = body.notes;
  if (body.status !== undefined) djangoBody.status = body.status;

  if (Object.keys(djangoBody).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  const res = await djangoFetch(`/api/v1/heatshield/${memberId}/`, {
    method: 'PATCH',
    body: JSON.stringify(djangoBody),
  });
  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: json.message ?? 'Update failed' }, { status: res.status });
  return NextResponse.json({ ok: true });
}
