import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

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

  const res = await djangoFetch(`/api/v1/heatshield/${memberId}/mark-serviced/`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: json.message ?? 'Failed' }, { status: res.status });

  return NextResponse.json({ ok: true, last_service_date: json.data?.last_service_date });
}
