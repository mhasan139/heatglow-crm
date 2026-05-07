import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const res = await djangoFetch(`/api/v1/campaigns/enrollments/${id}/stop/`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Manual stop' }),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
