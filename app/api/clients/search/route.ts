import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q') ?? '';
  const limit = Math.min(20, parseInt(request.nextUrl.searchParams.get('limit') ?? '10'));

  if (q.length < 2) return NextResponse.json({ data: [] });

  const sp = new URLSearchParams({ q, limit: String(limit) });
  const res = await djangoFetch(`/api/v1/clients/search/?${sp}`);
  if (!res.ok) return NextResponse.json({ error: 'Search failed' }, { status: 500 });

  const json = await res.json();
  // Map client_id → id for frontend compatibility
  const data = (json.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.client_id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    postcode: c.postcode,
    is_heatshield: c.is_heatshield,
  }));

  return NextResponse.json({ data });
}
