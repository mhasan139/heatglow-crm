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

  let body: { reason?: string; send_email?: boolean } = {};
  try { body = await request.json(); } catch { /* optional body */ }

  const res = await djangoFetch(`/api/v1/enquiries/${enquiryId}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason: body.reason ?? '' }),
  });
  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: json.message ?? 'Failed to reject' }, { status: res.status });

  return NextResponse.json({
    ok: true,
    enquiry: transformEnquiry(json.data),
  });
}
