import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  ['status', 'sequence_id', 'search', 'page', 'page_size'].forEach((k) => {
    const v = sp.get(k);
    if (v) params.set(k, v);
  });

  const res = await djangoFetch(`/api/v1/campaigns/enrollments/?${params}`);
  if (!res.ok) return NextResponse.json({ error: 'Failed' }, { status: res.status });
  return NextResponse.json(await res.json());
}
