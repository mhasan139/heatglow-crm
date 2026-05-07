import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/dashboard/sm8/status/');
  if (!res.ok) return NextResponse.json({ connected: false, last_sync: null });

  const json = await res.json();
  return NextResponse.json(json.data);
}
