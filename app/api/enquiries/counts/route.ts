import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/enquiries/counts/');
  if (!res.ok) return NextResponse.json({ All: 0, New: 0, Qualified: 0, Rejected: 0, Expired: 0 });

  const json = await res.json();
  return NextResponse.json(json.counts ?? { All: 0, New: 0, Qualified: 0, Rejected: 0, Expired: 0 });
}
