import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

async function requireUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/dashboard/settings/');
  if (!res.ok) return NextResponse.json({ error: 'Failed to load settings' }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const res = await djangoFetch('/api/v1/dashboard/settings/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as Record<string, string>).error ?? 'Update failed' }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
