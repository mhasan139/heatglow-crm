import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformClient } from '@/lib/django';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '25';
  const search = searchParams.get('search') ?? '';
  const isHeatshield = searchParams.get('heatshield_only') ?? searchParams.get('is_heatshield') ?? '';
  const sortBy = searchParams.get('sort_by') ?? '';

  const sp = new URLSearchParams({ page, page_size: limit });
  if (search) sp.set('search', search);
  if (isHeatshield === 'true' || isHeatshield === '1') sp.set('is_heatshield', 'true');
  if (sortBy) sp.set('sort_by', sortBy);

  const res = await djangoFetch(`/api/v1/clients/?${sp}`);
  if (!res.ok) return NextResponse.json({ error: 'Failed to load clients' }, { status: res.status });

  const json = await res.json();
  return NextResponse.json({
    data: (json.data ?? []).map(transformClient),
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: parseInt(limit),
  });
}
