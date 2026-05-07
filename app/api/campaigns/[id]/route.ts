import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// GET /api/campaigns/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const res = await djangoFetch(`/api/v1/campaigns/${id}/`);
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const json = await res.json();
  const stats = json._stats ?? {};
  const emails = json._emails ?? [];
  // Strip private fields from campaign before returning
  const { _stats: _s, _emails: _e, ...campaign } = json;
  return NextResponse.json({
    campaign,
    stats: {
      sent: stats.sent ?? campaign.recipient_count ?? 0,
      opened: stats.opened ?? 0,
      clicked: stats.clicked ?? 0,
      total: stats.total ?? campaign.recipient_count ?? 0,
    },
    emails,
  });
}

// PATCH /api/campaigns/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Map body_html → body for Django
  const djangoBody: Record<string, unknown> = { ...body };
  if (djangoBody.body_html !== undefined) {
    djangoBody.body = djangoBody.body_html;
    delete djangoBody.body_html;
  }

  const res = await djangoFetch(`/api/v1/campaigns/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(djangoBody),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const res = await djangoFetch(`/api/v1/campaigns/${id}/`, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return NextResponse.json({ error: json.error ?? 'Failed to delete' }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
