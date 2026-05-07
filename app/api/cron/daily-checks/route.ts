import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/cron/daily-checks — Runs at 6am UTC daily
// - Flags HeatShield members where service is due (305+ days)
// - Alerts Gareth about stale enquiries (48h+ unreviewed)
// - Auto-expires enquiries older than 14 days with no action
// - Proactive SM8 OAuth token refresh check
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results: Record<string, number> = {};
  const errors: string[] = [];

  // ── 1. Flag HeatShield members where service is due ──────────────────────────
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 305);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const { data: dueMembers } = await supabase
      .from('heatshield_members')
      .select('id, customer_name')
      .eq('status', 'Active')
      .eq('service_due_flag', false)
      .lte('last_service_date', cutoff)
      .is('deleted_at', null);

    if (dueMembers && dueMembers.length > 0) {
      const ids = dueMembers.map((m) => m.id);
      await supabase
        .from('heatshield_members')
        .update({ service_due_flag: true })
        .in('id', ids);

      // Log each flagged member
      await supabase.from('audit_log').insert(
        dueMembers.map((m) => ({
          event_type: 'heatshield_service_due_flagged',
          entity_type: 'heatshield_member',
          entity_id: m.id,
          description: `${m.customer_name} flagged as service due`,
          actor: 'cron',
          metadata: {},
        }))
      );
    }

    results.heatshield_flagged = dueMembers?.length ?? 0;
  } catch (err) {
    errors.push(`heatshield_check: ${err}`);
  }

  // ── 2. Alert Gareth about stale enquiries (48h+ unreviewed) ─────────────────
  try {
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: staleEnquiries } = await supabase
      .from('enquiries')
      .select('id, customer_name, job_type, urgency, created_at')
      .eq('status', 'New')
      .lte('created_at', cutoff48h)
      .is('deleted_at', null);

    if (staleEnquiries && staleEnquiries.length > 0) {
      const { sendSystemAlert } = await import('@/lib/resend');
      const names = staleEnquiries.map((e) => `${e.customer_name} (${e.job_type})`).join(', ');
      await sendSystemAlert(
        `⚠️ ${staleEnquiries.length} enquiry${staleEnquiries.length > 1 ? 'ies' : 'y'} unreviewed for 48+ hours: ${names}`
      );
    }

    results.stale_enquiries = staleEnquiries?.length ?? 0;
  } catch (err) {
    errors.push(`stale_enquiries: ${err}`);
  }

  // ── 3. Auto-expire enquiries older than 14 days with no action ───────────────
  try {
    const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: toExpire } = await supabase
      .from('enquiries')
      .select('id')
      .eq('status', 'New')
      .lte('created_at', cutoff14d)
      .is('deleted_at', null);

    if (toExpire && toExpire.length > 0) {
      const ids = toExpire.map((e) => e.id);
      await supabase
        .from('enquiries')
        .update({ status: 'Expired', expired_at: new Date().toISOString() })
        .in('id', ids);
    }

    results.enquiries_expired = toExpire?.length ?? 0;
  } catch (err) {
    errors.push(`expire_enquiries: ${err}`);
  }

  // ── 4. Proactive SM8 OAuth token refresh check ───────────────────────────────
  try {
    const { data: tokenRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'sm8_oauth_token_expires_at')
      .maybeSingle();

    if (tokenRow?.value) {
      const expiresAt = new Date(tokenRow.value).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() + oneDayMs >= expiresAt) {
        const { sm8 } = await import('@/lib/sm8');
        const { data: refreshRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'sm8_oauth_refresh_token')
          .maybeSingle();

        if (refreshRow?.value) {
          await sm8.refreshAccessToken(refreshRow.value);
          results.sm8_token_refreshed = 1;
        }
      }
    }
  } catch (err) {
    errors.push(`sm8_token_refresh: ${err}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
