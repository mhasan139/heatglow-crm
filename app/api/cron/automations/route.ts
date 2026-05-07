import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendEmail, getEmailConfig } from '@/lib/resend';

// GET /api/cron/automations — runs at 9am UTC daily
export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceClient();
  const { garethEmail: GARETH_EMAIL } = await getEmailConfig();
  const today = new Date();
  const results = {
    tier1_sent: 0,
    tier2_drafts_created: 0,
    errors: [] as string[],
  };

  // ── Tier 1: HeatShield reminders (send directly) ──────────────────────────

  const reminderWindows = [
    { days: 305, label: '60-day', type: 'heatshield_service_due' },
    { days: 335, label: '30-day', type: 'heatshield_service_due' },
    { days: 365, label: 'day-of', type: 'heatshield_service_due' },
  ];

  for (const window of reminderWindows) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - window.days);
    const dateStr = targetDate.toISOString().slice(0, 10);

    const { data: members } = await db
      .from('heatshield_members')
      .select('id, client_id, last_service_date, reminder_draft_created_at, clients(name, email)')
      .eq('status', 'Active')
      .gte('last_service_date', dateStr)
      .lte('last_service_date', dateStr)
      .is('deleted_at', null);

    if (!members) continue;

    for (const member of members) {
      // Skip if reminder already sent recently
      if (member.reminder_draft_created_at) {
        const lastReminder = new Date(member.reminder_draft_created_at);
        const daysSince = (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 28) continue;
      }

      const client = Array.isArray(member.clients) ? member.clients[0] : member.clients;
      if (!client?.email) continue;

      const firstName = (client.name as string).split(' ')[0];
      const dueDate = new Date(member.last_service_date);
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      const dueDateStr = dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      const subject = window.days === 365
        ? `Your HeatShield service is due today — ${firstName}`
        : `Your HeatShield annual service is coming up — ${firstName}`;

      const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<h2>Hi ${firstName},</h2>
<p>Your HeatShield annual service ${window.days === 365 ? 'is due <strong>today</strong>' : `is due on <strong>${dueDateStr}</strong>`}.</p>
<p>As a valued HeatShield member, your annual boiler service keeps your system running safely and efficiently — and ensures your membership remains active.</p>
<p>Please get in touch to book your service at a convenient time.</p>
<p style="margin-top:24px;"><a href="mailto:info@heatglow.co.uk" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Contact Us to Book</a></p>
<p style="margin-top:24px;">Warm regards,<br><strong>Gareth at HeatGlow</strong></p>
</div>`;

      await sendEmail(client.email as string, subject, html, 'heatshield_reminder', 'heatshield_member', member.id);

      await db
        .from('heatshield_members')
        .update({ reminder_draft_created_at: today.toISOString() })
        .eq('id', member.id);

      results.tier1_sent++;
    }
  }

  // ── Tier 2: Win-back (drafts for Gareth to approve) ──────────────────────

  const winBackCutoff = new Date(today);
  winBackCutoff.setMonth(winBackCutoff.getMonth() - 18);

  const { data: winBackClients } = await db
    .from('clients')
    .select('id, name, email, last_job_date')
    .lt('last_job_date', winBackCutoff.toISOString().slice(0, 10))
    .not('email', 'is', null)
    .is('deleted_at', null)
    .limit(100);

  if (winBackClients && winBackClients.length > 0) {
    // Check if a win-back draft was created in the last 90 days
    const { data: recentDraft } = await db
      .from('campaign_drafts')
      .select('id')
      .eq('trigger_type', 'win_back')
      .eq('status', 'Draft')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .is('deleted_at', null)
      .limit(1);

    if (!recentDraft || recentDraft.length === 0) {
      const { data: draft } = await db
        .from('campaign_drafts')
        .insert({
          name: `Win-Back — ${winBackClients.length} inactive customers`,
          trigger_type: 'win_back',
          status: 'Draft',
          recipient_count: winBackClients.length,
          segment_description: 'Customers with no job in the last 18 months',
          segment_filters: [{ field: 'last_job_date', operator: 'lt', value: winBackCutoff.toISOString().slice(0, 10) }],
          subject: 'We miss you — is there anything we can help with?',
          body: `Hi {first_name},\n\nIt's been a while since we last worked together, and we wanted to check in.\n\nIf you need any heating or plumbing help — from boiler servicing to emergency repairs — we'd love to hear from you.\n\nGet in touch today and we'll make sure you're looked after.\n\nWarm regards,\nGareth at HeatGlow`,
          attributed_revenue: 0,
        })
        .select()
        .single();

      if (draft) {
        results.tier2_drafts_created++;
        await sendEmail(
          GARETH_EMAIL,
          `Campaign Queue: Win-Back draft ready (${winBackClients.length} recipients)`,
          `<p>A win-back campaign draft has been created for ${winBackClients.length} customers inactive for 18+ months.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/campaigns">Review in Campaign Queue →</a></p>`,
          'campaign_draft_notification'
        );
      }
    }
  }

  // ── Tier 2: Service reminder (annual boiler service) ───────────────────────

  const serviceReminderStart = new Date(today);
  serviceReminderStart.setMonth(serviceReminderStart.getMonth() - 13);
  const serviceReminderEnd = new Date(today);
  serviceReminderEnd.setMonth(serviceReminderEnd.getMonth() - 11);

  const { data: serviceClients } = await db
    .from('clients')
    .select('id, name, email, last_job_date')
    .gte('last_job_date', serviceReminderStart.toISOString().slice(0, 10))
    .lte('last_job_date', serviceReminderEnd.toISOString().slice(0, 10))
    .eq('is_heatshield', false)
    .not('email', 'is', null)
    .is('deleted_at', null)
    .limit(100);

  if (serviceClients && serviceClients.length > 0) {
    const { data: recentServiceDraft } = await db
      .from('campaign_drafts')
      .select('id')
      .eq('trigger_type', 'service_reminder')
      .eq('status', 'Draft')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .is('deleted_at', null)
      .limit(1);

    if (!recentServiceDraft || recentServiceDraft.length === 0) {
      const { data: draft } = await db
        .from('campaign_drafts')
        .insert({
          name: `Annual Service Reminder — ${serviceClients.length} customers`,
          trigger_type: 'service_reminder',
          status: 'Draft',
          recipient_count: serviceClients.length,
          segment_description: 'Customers with last job 11–13 months ago (annual boiler service due)',
          segment_filters: [
            { field: 'last_job_date', operator: 'gte', value: serviceReminderStart.toISOString().slice(0, 10) },
            { field: 'last_job_date', operator: 'lte', value: serviceReminderEnd.toISOString().slice(0, 10) },
          ],
          subject: "Is your boiler due for its annual service? — {first_name}",
          body: `Hi {first_name},\n\nIt's around this time of year that your boiler should have its annual service — keeping it running safely and efficiently.\n\nRegular servicing can also prevent costly breakdowns and keep your warranty valid.\n\nGet in touch to book your annual service at a time that suits you.\n\nWarm regards,\nGareth at HeatGlow`,
          attributed_revenue: 0,
        })
        .select()
        .single();

      if (draft) {
        results.tier2_drafts_created++;
        await sendEmail(
          GARETH_EMAIL,
          `Campaign Queue: Service reminder draft ready (${serviceClients.length} recipients)`,
          `<p>An annual service reminder draft has been created for ${serviceClients.length} customers.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/campaigns">Review in Campaign Queue →</a></p>`,
          'campaign_draft_notification'
        );
      }
    }
  }

  // ── Tier 2: Quote lapse follow-up ─────────────────────────────────────────

  const { data: lapsedQuoteJobs } = await db
    .from('jobs')
    .select('id, client_id, clients(name, email)')
    .eq('quote_lapsed', true)
    .eq('sm8_status', 'Quote')
    .is('deleted_at', null)
    .limit(50);

  if (lapsedQuoteJobs && lapsedQuoteJobs.length > 0) {
    const { data: recentQuoteDraft } = await db
      .from('campaign_drafts')
      .select('id')
      .eq('trigger_type', 'quote_lapsed')
      .eq('status', 'Draft')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .is('deleted_at', null)
      .limit(1);

    if (!recentQuoteDraft || recentQuoteDraft.length === 0) {
      const { data: draft } = await db
        .from('campaign_drafts')
        .insert({
          name: `Lapsed Quote Follow-up — ${lapsedQuoteJobs.length} customers`,
          trigger_type: 'quote_lapsed',
          status: 'Draft',
          recipient_count: lapsedQuoteJobs.length,
          segment_description: 'Customers with a quote that has lapsed without response',
          subject: 'Still thinking about it? Your quote is still available — {first_name}',
          body: `Hi {first_name},\n\nWe sent you a quote a little while back and wanted to check in to see if you have any questions.\n\nWe'd love to help, and the quote is still valid. If you'd like to go ahead or need anything adjusted, just reply to this email.\n\nWarm regards,\nGareth at HeatGlow`,
          attributed_revenue: 0,
        })
        .select()
        .single();

      if (draft) {
        results.tier2_drafts_created++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    run_at: today.toISOString(),
  });
}
