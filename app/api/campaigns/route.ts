import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// GET /api/campaigns — paginated campaign list
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const res = await djangoFetch(`/api/v1/campaigns/?${sp.toString()}`);
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

// POST /api/campaigns — create campaign draft
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Map frontend field names to Django model fields
  const djangoBody = {
    name: body.name,
    subject: body.subject ?? '',
    body: body.body_html ?? body.body ?? '',
    segment_filters: body.segment_filters ?? [],
    segment_description: body.segment_description ?? '',
    recipient_count: body.recipient_count ?? null,
    trigger_type: body.trigger_type ?? 'manual',
    scheduled_at: body.scheduled_at ?? null,
    status: 'Draft',
  };

  const res = await djangoFetch('/api/v1/campaigns/', {
    method: 'POST',
    body: JSON.stringify(djangoBody),
  });
  const json = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: json.error ?? 'Failed to create campaign' }, { status: res.status });
  }

  return NextResponse.json(json, { status: 201 });
}
