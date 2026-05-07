import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/cron/invoice-alerts — Runs 8am UTC weekdays
// Finds jobs with invoice_status='Awaiting Payment' older than overdue_invoice_days
// Sends digest email to Gareth with list + total overdue value
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get overdue_invoice_days from settings (default 14)
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'overdue_invoice_days')
    .maybeSingle();

  const overdueDays = parseInt(setting?.value ?? '14');
  const cutoffDate = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: overdueJobs, error } = await supabase
    .from('jobs')
    .select('id, job_ref, invoice_amount, invoice_created_at, clients(name, phone)')
    .eq('invoice_status', 'Awaiting Payment')
    .lte('invoice_created_at', cutoffDate)
    .is('deleted_at', null)
    .order('invoice_amount', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!overdueJobs || overdueJobs.length === 0) {
    return NextResponse.json({ ok: true, overdue: 0 });
  }

  const totalPence = overdueJobs.reduce((sum, j) => sum + (j.invoice_amount ?? 0), 0);
  const totalFormatted = `£${(totalPence / 100).toFixed(2)}`;

  const { sendSystemAlert } = await import('@/lib/resend');
  const rows = overdueJobs.slice(0, 10).map((j) => {
    const client = Array.isArray(j.clients) ? j.clients[0] : j.clients;
    const name = client?.name ?? 'Unknown';
    const amount = j.invoice_amount ? `£${(j.invoice_amount / 100).toFixed(2)}` : '—';
    return `  • ${name} — ${amount} (${j.job_ref ?? 'no ref'})`;
  }).join('\n');

  await sendSystemAlert(
    `💰 ${overdueJobs.length} overdue invoice${overdueJobs.length > 1 ? 's' : ''} totalling ${totalFormatted}\n\n${rows}${overdueJobs.length > 10 ? `\n  ... and ${overdueJobs.length - 10} more` : ''}`
  );

  return NextResponse.json({ ok: true, overdue: overdueJobs.length, total: totalFormatted });
}
