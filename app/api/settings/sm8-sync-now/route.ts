import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/dashboard/sm8/sync/', { method: 'POST' });
  const json = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: json.message ?? 'Sync failed' }, { status: res.status });
  }

  return NextResponse.json({ ok: true, message: json.message });
}
