import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/webhooks/unsubscribe — add email to suppression list
// Also handles GET from email unsubscribe links
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  const db = createServiceClient();
  await db
    .from('suppression_list')
    .upsert({ email: email.toLowerCase(), reason: 'unsubscribe' }, { onConflict: 'email' });

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;padding:0 24px;text-align:center;">
<h2>Unsubscribed</h2>
<p>You've been removed from our mailing list and won't receive further marketing emails from HeatGlow.</p>
<p style="color:#6b7280;font-size:14px;">If this was a mistake, please contact us at <a href="mailto:info@heatglow.co.uk">info@heatglow.co.uk</a></p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true }); // always 200
  }

  const email = body.email;
  if (email) {
    const db = createServiceClient();
    await db
      .from('suppression_list')
      .upsert({ email: email.toLowerCase(), reason: 'unsubscribe' }, { onConflict: 'email' });
  }

  return NextResponse.json({ ok: true });
}
