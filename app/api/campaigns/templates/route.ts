import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// GET /api/campaigns/templates — list all templates
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const search = request.nextUrl.searchParams.get('search') ?? '';
  const sp = new URLSearchParams();
  if (search) sp.set('search', search);

  const res = await djangoFetch(`/api/v1/campaigns/templates/?${sp}`);
  if (!res.ok) return NextResponse.json({ error: 'Failed to load templates' }, { status: res.status });

  const json = await res.json();
  return NextResponse.json({ data: json.data ?? [], total: json.total ?? 0 });
}

// POST /api/campaigns/templates — create template
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name || !body.subject || !body.body) {
    return NextResponse.json({ error: 'name, subject, and body are required' }, { status: 400 });
  }

  const res = await djangoFetch('/api/v1/campaigns/templates/', {
    method: 'POST',
    body: JSON.stringify({ name: body.name, subject: body.subject, body: body.body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.error ?? 'Failed to create template' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
