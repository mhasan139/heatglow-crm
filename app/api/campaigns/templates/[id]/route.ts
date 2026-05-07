import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// GET /api/campaigns/templates/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const res = await djangoFetch(`/api/v1/campaigns/templates/${id}/`);
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await res.json());
}

// PATCH /api/campaigns/templates/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const res = await djangoFetch(`/api/v1/campaigns/templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.error ?? 'Update failed' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

// DELETE /api/campaigns/templates/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const res = await djangoFetch(`/api/v1/campaigns/templates/${id}/`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: 'Delete failed' }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
