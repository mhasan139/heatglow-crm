import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformEnquiry } from '@/lib/django';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const enquiryId = parseInt(id);
  if (isNaN(enquiryId)) return NextResponse.json({ error: 'Invalid enquiry ID' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { override_note?: string; push_to_sm8?: boolean } = {};
  try { body = await request.json(); } catch { /* optional body */ }

  const pushToSM8 = body.push_to_sm8 !== false; // default true

  // Step 1 — Approve in Django
  const approveRes = await djangoFetch(`/api/v1/enquiries/${enquiryId}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ override_note: body.override_note ?? '' }),
  });
  const approveJson = await approveRes.json();
  if (!approveRes.ok) {
    return NextResponse.json(
      { error: approveJson.message ?? 'Failed to approve enquiry' },
      { status: approveRes.status }
    );
  }

  const enquiryData = approveJson.data;

  // Step 2 — Push to SM8 via Django (uses x-api-key auth which works for writes)
  if (pushToSM8) {
    const pushRes = await djangoFetch(`/api/v1/enquiries/${enquiryId}/sm8-push/`, {
      method: 'POST',
    });
    const pushJson = await pushRes.json();

    if (!pushRes.ok) {
      return NextResponse.json({
        ok: true,
        sm8_pushed: false,
        sm8_error: pushJson.message ?? 'SM8 push failed',
        enquiry: transformEnquiry(enquiryData),
      });
    }

    return NextResponse.json({
      ok: true,
      sm8_pushed: true,
      sm8_job_uuid: pushJson.sm8_job_uuid,
      enquiry: transformEnquiry(pushJson.data ?? enquiryData),
    });
  }

  return NextResponse.json({
    ok: true,
    sm8_pushed: false,
    enquiry: transformEnquiry(enquiryData),
  });
}
