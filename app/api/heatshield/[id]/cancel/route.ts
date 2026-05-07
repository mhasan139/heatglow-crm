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

  let body: { cancellation_reason?: string } = {};
  try { body = await request.json(); } catch { /* no body fine */ }

  const res = await djangoFetch(`/api/v1/heatshield/${memberId}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason: body.cancellation_reason ?? '' }),
  });
  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: json.message ?? 'Failed' }, { status: res.status });

  return NextResponse.json({ ok: true, reminder: json.message });
}
