import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformClient, transformJob } from '@/lib/django';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = parseInt(id);
  if (isNaN(clientId)) return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [clientRes, jobsRes] = await Promise.all([
    djangoFetch(`/api/v1/clients/${clientId}/`),
    djangoFetch(`/api/v1/clients/${clientId}/jobs/?page_size=50`),
  ]);

  if (!clientRes.ok) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const clientJson = await clientRes.json();
  const jobsJson = jobsRes.ok ? await jobsRes.json() : { data: [] };

  return NextResponse.json({
    client: transformClient(clientJson.data),
    jobs: (jobsJson.data ?? []).map(transformJob),
    heatshield: null,
    emails: [],
    enquiries: [],
  });
}
