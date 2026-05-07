import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

interface ResendWebhookEvent {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    created_at?: string;
  };
}

// POST /api/resend/webhook — open/click tracking from Resend webhooks
export async function POST(request: NextRequest) {
  let event: ResendWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = event;
  const messageId = data?.email_id;

  if (!messageId) {
    return NextResponse.json({ ok: true }); // ignore events without email_id
  }

  const db = createServiceClient();
  const now = new Date().toISOString();

  if (type === 'email.opened') {
    await db
      .from('campaign_emails')
      .update({ opened_at: now })
      .eq('resend_message_id', messageId)
      .is('opened_at', null); // only set first open
  } else if (type === 'email.clicked') {
    await db
      .from('campaign_emails')
      .update({ clicked_at: now })
      .eq('resend_message_id', messageId)
      .is('clicked_at', null);
  } else if (type === 'email.bounced' || type === 'email.complained') {
    // Auto-suppress bounced/complained emails
    const recipientEmail = data?.to?.[0];
    if (recipientEmail) {
      await db
        .from('suppression_list')
        .upsert({ email: recipientEmail.toLowerCase(), reason: type === 'email.complained' ? 'manual' : 'unsubscribe' }, { onConflict: 'email' });
    }
  }

  // Attribution: check if recipient made a booking within 30 days
  if (type === 'email.opened') {
    void attributeRevenue(messageId, db);
  }

  return NextResponse.json({ ok: true });
}

async function attributeRevenue(messageId: string, db: ReturnType<typeof createServiceClient>) {
  const { data: emailRow } = await db
    .from('campaign_emails')
    .select('campaign_draft_id, client_id, opened_at')
    .eq('resend_message_id', messageId)
    .single();

  if (!emailRow?.client_id || !emailRow?.campaign_draft_id) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentJobs } = await db
    .from('jobs')
    .select('invoice_amount')
    .eq('client_id', emailRow.client_id)
    .gte('job_date', thirtyDaysAgo)
    .eq('invoice_status', 'Paid')
    .is('deleted_at', null);

  if (!recentJobs || recentJobs.length === 0) return;

  const attributed = recentJobs.reduce(
    (sum: number, j: { invoice_amount: number | null }) => sum + (j.invoice_amount ?? 0),
    0
  );

  if (attributed > 0) {
    // Fetch current value and increment
    const { data: draft } = await db
      .from('campaign_drafts')
      .select('attributed_revenue')
      .eq('id', emailRow.campaign_draft_id)
      .single();

    if (draft) {
      await db
        .from('campaign_drafts')
        .update({ attributed_revenue: (draft.attributed_revenue ?? 0) + attributed })
        .eq('id', emailRow.campaign_draft_id);
    }
  }
}
