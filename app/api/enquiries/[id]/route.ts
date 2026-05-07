import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch, transformEnquiry } from '@/lib/django';

function buildTimeline(raw: Record<string, unknown>) {
  const events: Array<{ id: string; description: string; actor: string; event_type: string; created_at: string }> = [];

  events.push({
    id: 'submitted',
    event_type: 'enquiry.submitted',
    description: 'Enquiry submitted via website',
    actor: 'System',
    created_at: raw.created_at as string,
  });

  if (raw.ai_score !== null && raw.ai_score !== undefined) {
    const rec = (raw.ai_recommendation as string) || 'REVIEW';
    events.push({
      id: 'ai-scored',
      event_type: 'ai.scored',
      description: `AI scoring completed — Score ${raw.ai_score}, recommendation: ${rec}`,
      actor: 'Gemini AI',
      created_at: raw.created_at as string,
    });
  }

  if (raw.reviewed_at) {
    const approved = raw.status === 'Approved';
    events.push({
      id: 'reviewed',
      event_type: approved ? 'enquiry.approved' : 'enquiry.rejected',
      description: approved ? 'Enquiry qualified' : 'Enquiry rejected',
      actor: 'Staff',
      created_at: raw.reviewed_at as string,
    });
  }

  // Override note (qualification/rejection reason) — show when present and distinct from notes
  const overrideNote = (raw.override_note as string ?? '').trim();
  if (overrideNote) {
    events.push({
      id: 'override-note',
      event_type: 'note.added',
      description: overrideNote,
      actor: 'Staff',
      created_at: (raw.reviewed_at as string) ?? (raw.updated_at as string) ?? (raw.created_at as string),
    });
  }

  // Internal notes from EnquiryNote records
  const notes = (raw.notes as Array<{ id: number; text: string; created_at: string }>) ?? [];
  for (const n of notes) {
    events.push({
      id: `note-${n.id}`,
      event_type: 'note.added',
      description: n.text,
      actor: 'Staff',
      created_at: n.created_at,
    });
  }

  return events;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const enquiryId = parseInt(id);
  if (isNaN(enquiryId)) return NextResponse.json({ error: 'Invalid enquiry ID' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch(`/api/v1/enquiries/${enquiryId}/`);
  if (!res.ok) return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });

  const json = await res.json();
  const raw = json.data;

  // Fetch matched client detail if one exists
  let matchedClient = null;
  if (raw.matched_client) {
    const clientRes = await djangoFetch(`/api/v1/clients/${raw.matched_client}/`);
    if (clientRes.ok) {
      const cj = await clientRes.json();
      const c = cj.data ?? cj;
      matchedClient = {
        id: c.client_id,
        name: c.name,
        phone: c.phone ?? '',
        email: c.email ?? '',
        job_count: c.job_count ?? 0,
        total_spend: parseFloat(c.total_spend ?? '0'),
        is_heatshield: c.is_heatshield ?? false,
      };
    }
  }

  return NextResponse.json({
    enquiry: transformEnquiry(raw),
    timeline: buildTimeline(raw),
    matched_client: matchedClient,
  });
}

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

  let body: { note?: string } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const text = (body.note ?? '').trim();
  if (!text) return NextResponse.json({ error: 'Note text is required' }, { status: 400 });

  const res = await djangoFetch(`/api/v1/enquiries/${enquiryId}/notes/`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
