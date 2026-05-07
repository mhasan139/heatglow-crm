import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// GET /api/suppression — list suppressed emails (proxied to Django)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const res = await djangoFetch(`/api/v1/campaigns/suppression/?${sp.toString()}`);
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

// POST /api/suppression — add email (proxied to Django)
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

  const res = await djangoFetch('/api/v1/campaigns/suppression/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

// DELETE /api/suppression?email=... — remove from list (proxied to Django)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 });

  const res = await djangoFetch(
    `/api/v1/campaigns/suppression/?email=${encodeURIComponent(email)}`,
    { method: 'DELETE' },
  );

  if (res.status === 204) return NextResponse.json({ ok: true });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
