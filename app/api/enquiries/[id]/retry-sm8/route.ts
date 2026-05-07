import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

// POST /api/enquiries/[id]/retry-sm8 — Retry a failed SM8 push
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const enquiryId = parseInt(id);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pushRes = await djangoFetch(`/api/v1/enquiries/${enquiryId}/sm8-push/`, {
    method: 'POST',
  });
  const pushJson = await pushRes.json();

  if (!pushRes.ok) {
    return NextResponse.json(
      { error: pushJson.message ?? 'SM8 push failed' },
      { status: pushRes.status }
    );
  }

  return NextResponse.json({ ok: true, sm8_job_uuid: pushJson.sm8_job_uuid });
}
