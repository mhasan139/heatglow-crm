import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// POST /api/campaigns/[id]/send — delegate to Django which handles Resend + tracking
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const res = await djangoFetch(`/api/v1/campaigns/${id}/send/`, { method: 'POST' });
  const json = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: json.error ?? 'Send failed' }, { status: res.status });
  }

  return NextResponse.json({ ok: true, message: 'Campaign send started.' });
}
