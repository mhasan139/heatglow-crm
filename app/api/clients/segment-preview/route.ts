import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { countSegment } from '@/lib/segments';
import type { SegmentFilter } from '@/types/index';

// POST /api/clients/segment-preview — count matching clients for a given filter set
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { filters?: SegmentFilter[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const filters = body.filters ?? [];

  try {
    const count = await countSegment(filters);
    return NextResponse.json({ count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
