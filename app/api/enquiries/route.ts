import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformEnquiry } from '@/lib/django';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '25';
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const urgency = searchParams.get('urgency') ?? '';
  const source = searchParams.get('source') ?? '';
  const lapsedOnly = searchParams.get('lapsed_quotes_only') ?? '';

  const sp = new URLSearchParams({ page, page_size: limit });
  if (search) sp.set('search', search);
  if (status && status !== 'All') {
    const djangoStatus = status === 'Qualified' ? 'Approved' : status;
    sp.set('status', djangoStatus);
  }
  if (urgency) sp.set('urgency', urgency);
  if (source) sp.set('source', source);
  if (lapsedOnly === 'true') sp.set('lapsed_quotes_only', 'true');

  const res = await djangoFetch(`/api/v1/enquiries/?${sp}`);
  if (!res.ok) return NextResponse.json({ error: 'Failed to load enquiries' }, { status: res.status });

  const json = await res.json();

  // Map Django status names to frontend names for the counts
  const rawCounts: Record<string, number> = json.status_counts ?? {};
  const statusCounts: Record<string, number> = {
    New: rawCounts['New'] ?? 0,
    Qualified: rawCounts['Approved'] ?? 0,
    Rejected: rawCounts['Rejected'] ?? 0,
    Expired: rawCounts['Expired'] ?? 0,
  };
  statusCounts['All'] = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    data: (json.data ?? []).map(transformEnquiry),
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: parseInt(limit),
    status_counts: statusCounts,
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';

  const res = await djangoFetch('/api/v1/enquiries/submit/', {
    method: 'POST',
    headers: { 'X-Real-IP': ip },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
