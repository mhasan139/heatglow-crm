import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';
import { countSegment } from '@/lib/segments';
import type { SegmentFilter } from '@/types/index';

// Fetch count for a named segment from Django (where all client data lives)
async function djangoSegmentCount(segmentId: string, subFilter: string): Promise<number> {
  const sp = new URLSearchParams({ segment: segmentId, sub_filter: subFilter });
  const res = await djangoFetch(`/api/v1/clients/segment-count/?${sp}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Django segment-count error (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.count ?? 0;
}

// The predefined segments supported by the campaign audience picker
const PREDEFINED_SEGMENTS = new Set([
  'all-customers',
  'heatshield-active',
  'heatshield-due',
  'lapsed-quotes',
  'inactive-12m',
  'inactive-customers',
  'one-time',
  'one-time-customers',
  'heatshield-lapsed',
  // legacy IDs used by the AI campaign flow
  'heatshield-renewals',
  'qualified-no-quote',
]);

// POST /api/campaigns/segment-preview
// Body: { segment_id, sub_filter? } OR { custom_filters: SegmentFilter[] }
// Returns: { count, filters }
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { segment_id?: string; sub_filter?: string; custom_filters?: SegmentFilter[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body.segment_id) {
      const segId = body.segment_id;
      const subFilter = body.sub_filter ?? '3m';

      // Legacy Supabase-based segments that require cross-table resolution
      if (segId === 'heatshield-renewals' || segId === 'qualified-no-quote') {
        return await handleLegacySegment(segId, subFilter);
      }

      if (!PREDEFINED_SEGMENTS.has(segId)) {
        return NextResponse.json({ error: `Unknown segment_id: ${segId}` }, { status: 400 });
      }

      const count = await djangoSegmentCount(segId, subFilter);
      // For predefined segments the actual filters are resolved server-side at send time;
      // return an empty array as a placeholder — sender.ts re-resolves via segment_description.
      return NextResponse.json({ count, filters: [{ field: '__segment__', operator: 'eq', value: segId }] });
    }

    if (body.custom_filters) {
      // Custom filter builder — still uses Supabase (countSegment queries the clients table)
      // If Supabase clients table is empty, this will return 0 — custom filters are a
      // secondary feature; predefined segments are the primary path.
      const count = await countSegment(body.custom_filters);
      return NextResponse.json({ count, filters: body.custom_filters });
    }

    return NextResponse.json({ error: 'segment_id or custom_filters required' }, { status: 400 });
  } catch (err) {
    console.error('[segment-preview]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Legacy cross-table segments that were originally implemented against Supabase.
// These still work even with an empty Supabase clients table because we can delegate
// to the Django backend for the final send.
async function handleLegacySegment(
  segmentId: string,
  subFilter: string
): Promise<NextResponse> {
  if (segmentId === 'heatshield-renewals') {
    const count = await djangoSegmentCount('heatshield-due', subFilter).catch(() => 0);
    return NextResponse.json({ count, filters: [{ field: '__segment__', operator: 'eq', value: segmentId }] });
  }

  if (segmentId === 'qualified-no-quote') {
    // Fallback to Django all-customers count as approximation
    const count = await djangoSegmentCount('all-customers', subFilter).catch(() => 0);
    return NextResponse.json({ count, filters: [{ field: '__segment__', operator: 'eq', value: segmentId }] });
  }

  return NextResponse.json({ count: 0, filters: [] });
}
