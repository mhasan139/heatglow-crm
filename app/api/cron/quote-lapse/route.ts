import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/cron/quote-lapse — Runs at 7am UTC daily
// Finds jobs with sm8_status=Quote and age >= quote_lapse_days setting
// Calls getJobActivities() to check for Quote Approved event
// If none found: sets quote_lapsed=true
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get quote_lapse_days from settings (default 3)
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'quote_lapse_days')
    .maybeSingle();

  const lapseDays = parseInt(setting?.value ?? '3');
  const cutoffDate = new Date(Date.now() - lapseDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Find un-lapsed quotes older than the threshold
  const { data: quotes, error } = await supabase
    .from('jobs')
    .select('id, sm8_job_uuid, quote_lapsed_checked_at')
    .eq('sm8_status', 'Quote')
    .eq('quote_lapsed', false)
    .lte('job_date', cutoffDate)
    .is('deleted_at', null)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!quotes || quotes.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, lapsed: 0 });
  }

  const { sm8 } = await import('@/lib/sm8');
  let lapsedCount = 0;

  for (const job of quotes) {
    try {
      const activities = await sm8.getJobActivities(job.sm8_job_uuid);
      const hasApproval = activities.some((a) =>
        a.activity_was?.toLowerCase().includes('quote approved') ||
        a.activity_was?.toLowerCase().includes('accepted')
      );

      // Mark checked regardless of outcome
      await supabase
        .from('jobs')
        .update({
          quote_lapsed_checked_at: new Date().toISOString(),
          quote_lapsed: !hasApproval,
        })
        .eq('id', job.id);

      if (!hasApproval) lapsedCount++;
    } catch {
      // If SM8 call fails, skip this job and try again tomorrow
    }
  }

  return NextResponse.json({ ok: true, checked: quotes.length, lapsed: lapsedCount });
}
