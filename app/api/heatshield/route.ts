import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformHeatShieldMember } from '@/lib/django';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '50';

  const sp = new URLSearchParams({ page, page_size: limit });
  if (status === 'service_due') {
    sp.set('service_due', 'true');
  } else if (status && status !== 'All') {
    sp.set('status', status);
  }
  if (search) sp.set('search', search);

  const res = await djangoFetch(`/api/v1/heatshield/?${sp}`);
  if (!res.ok) return NextResponse.json({ error: 'Failed to load members' }, { status: res.status });

  const json = await res.json();
  return NextResponse.json({
    data: (json.data ?? []).map(transformHeatShieldMember),
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: parseInt(limit),
    stats: json.stats ?? { total: 0, active: 0, service_due: 0, lapsed: 0, cancelled: 0, monthly_revenue_pence: 0 },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const res = await djangoFetch('/api/v1/heatshield/', {
    method: 'POST',
    body: JSON.stringify({ client: body.client_id, last_service_date: body.last_service_date, monthly_amount: body.monthly_amount_pence ? Number(body.monthly_amount_pence) / 100 : 10, notes: body.notes }),
  });

  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: json.message ?? 'Failed to create membership' }, { status: res.status });
  return NextResponse.json({ member: transformHeatShieldMember(json.data) }, { status: 201 });
}
