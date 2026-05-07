import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/campaigns/overview/');
  if (!res.ok) return NextResponse.json({ error: 'Failed to load overview' }, { status: res.status });
  return NextResponse.json(await res.json());
}
