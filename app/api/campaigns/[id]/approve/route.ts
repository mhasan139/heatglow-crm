import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// POST /api/campaigns/[id]/approve — save edits + approve + trigger send (all via Django)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* optional body */ }

  const res = await djangoFetch(`/api/v1/campaigns/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: json.error ?? 'Approve failed' }, { status: res.status });
  }

  return NextResponse.json(json);
}
