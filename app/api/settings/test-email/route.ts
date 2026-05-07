import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST /api/settings/test-email — Sends a test email to Gareth via Resend
export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sendTestEmail } = await import('@/lib/resend');
  const toEmail = user.email ?? 'gareth@heatglow.co.uk';
  const sent = await sendTestEmail(toEmail);

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent_to: toEmail });
}
