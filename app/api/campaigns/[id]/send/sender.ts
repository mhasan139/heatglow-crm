import { createServiceClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';
import { sendBatch } from '@/lib/resend';
import { getSuppressedEmails, personaliseEmail, wrapWithUnsubscribe } from '@/lib/segments';
import type { SegmentFilter } from '@/types/index';

const CHUNK_SIZE = 100;

interface DjangoClient {
  client_id: number;
  name: string;
  email: string | null;
  last_job_date: string | null;
}

// Fetch all clients for a named segment from Django (paginated, all pages)
async function djangoClientsForSegment(segmentId: string, subFilter = '3m'): Promise<DjangoClient[]> {
  const sp = new URLSearchParams({ segment: segmentId, sub_filter: subFilter, page_size: '500' });
  const res = await djangoFetch(`/api/v1/clients/segment-clients/?${sp}`);
  if (!res.ok) throw new Error(`Django segment-clients error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// Resolve segment_filters to a list of clients.
// Filters stored as [{ field: '__segment__', operator: 'eq', value: '<id>' }] are
// named Django segments; anything else falls back to a direct Django client list.
async function resolveClients(filters: SegmentFilter[]): Promise<DjangoClient[]> {
  const segmentFilter = filters.find((f) => f.field === '__segment__');

  if (segmentFilter) {
    const segId = String(segmentFilter.value);
    return djangoClientsForSegment(segId);
  }

  // Legacy / custom-filter path — fetch all clients from Django and filter in memory
  // (a proper filter endpoint can be added later; for now get all and filter)
  const res = await djangoFetch('/api/v1/clients/?page_size=5000&page=1');
  if (!res.ok) return [];
  const json = await res.json();
  const allClients: DjangoClient[] = (json.data ?? []).map((c: DjangoClient) => ({
    client_id: c.client_id,
    name: c.name,
    email: c.email,
    last_job_date: c.last_job_date,
  }));

  // Apply simple filters that we can resolve client-side
  return allClients.filter((c) => {
    for (const f of filters) {
      const val = c[f.field as keyof DjangoClient];
      if (f.operator === 'eq' && val !== f.value) return false;
      if (f.operator === 'gt' && !(val != null && val > f.value)) return false;
      if (f.operator === 'lt' && !(val != null && val < f.value)) return false;
    }
    return true;
  });
}

// Core send logic — called from approve route (fire-and-forget) or send route
export async function sendCampaign(campaignId: number): Promise<void> {
  const db = createServiceClient();

  const { data: campaign, error } = await db
    .from('campaign_drafts')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error || !campaign || !campaign.subject || !campaign.body) {
    console.error(`sendCampaign(${campaignId}): campaign not found or missing subject/body`);
    return;
  }

  await db
    .from('campaign_drafts')
    .update({ status: 'Sending' })
    .eq('id', campaignId);

  try {
    const filters = (campaign.segment_filters as SegmentFilter[] | null) ?? [];

    // Get clients from Django (where all 3,751 customers live)
    const djangoClients = await resolveClients(filters);

    if (djangoClients.length === 0) {
      await db
        .from('campaign_drafts')
        .update({ status: 'Sent', sent_at: new Date().toISOString() })
        .eq('id', campaignId);
      return;
    }

    // Filter suppressed emails
    const suppressed = await getSuppressedEmails();
    const eligible = djangoClients.filter(
      (c) => c.email && !suppressed.has(c.email!.toLowerCase())
    );

    const subjectTemplate = campaign.subject ?? '';
    const bodyTemplate = campaign.body ?? '';

    // Create campaign_emails rows in Supabase (for tracking)
    const emailRows = eligible.map((c) => ({
      campaign_draft_id: campaignId,
      recipient_email: c.email!,
      personalised_subject: personaliseEmail(subjectTemplate, {
        name: c.name,
        email: c.email,
        last_job_date: c.last_job_date,
      }),
      personalised_body: personaliseEmail(bodyTemplate, {
        name: c.name,
        email: c.email,
        last_job_date: c.last_job_date,
      }),
      status: 'Queued',
    }));

    if (emailRows.length === 0) {
      await db
        .from('campaign_drafts')
        .update({ status: 'Sent', sent_at: new Date().toISOString() })
        .eq('id', campaignId);
      return;
    }

    const { data: insertedEmails } = await db
      .from('campaign_emails')
      .insert(emailRows)
      .select('id, recipient_email, personalised_subject, personalised_body');

    if (!insertedEmails) throw new Error('Failed to insert campaign_emails');

    // Chunk and send via Resend
    for (let i = 0; i < insertedEmails.length; i += CHUNK_SIZE) {
      const chunk = insertedEmails.slice(i, i + CHUNK_SIZE);

      const batchPayload = chunk.map((e: {
        id: number;
        recipient_email: string;
        personalised_subject: string;
        personalised_body: string;
      }) => ({
        to: e.recipient_email,
        subject: e.personalised_subject,
        html: wrapWithUnsubscribe(
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">${e.personalised_body.replace(/\n/g, '<br>')}</div>`,
          e.recipient_email
        ),
      }));

      const messageIds = await sendBatch(batchPayload);

      await Promise.all(
        chunk.map((e: { id: number }, idx: number) =>
          db
            .from('campaign_emails')
            .update({
              status: messageIds[idx] ? 'Sent' : 'Failed',
              resend_message_id: messageIds[idx] || null,
              sent_at: new Date().toISOString(),
            })
            .eq('id', e.id)
        )
      );
    }

    await db
      .from('campaign_drafts')
      .update({
        status: 'Sent',
        sent_at: new Date().toISOString(),
        recipient_count: insertedEmails.length,
      })
      .eq('id', campaignId);

  } catch (err) {
    console.error(`sendCampaign(${campaignId}) failed:`, err);
    await db
      .from('campaign_drafts')
      .update({ status: 'Draft' })
      .eq('id', campaignId);
  }
}
