import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// GET /api/campaigns/[id]/recipients — live recipient list for the campaign's segment
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const res = await djangoFetch(`/api/v1/campaigns/${id}/recipients/`);
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
