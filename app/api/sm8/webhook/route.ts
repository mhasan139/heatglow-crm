import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/sm8/webhook — Receives new-client events from SM8
// SM8 fires this when a new company is created. We UPSERT immediately
// rather than waiting for the next hourly sync.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SM8 webhook payload contains the client data
    const clientUuid = body.uuid || body.company_uuid;
    if (!clientUuid) {
      return NextResponse.json({ ok: true }); // Not a client event; ignore
    }

    const supabase = createServiceClient();
    await supabase.from('clients').upsert(
      {
        sm8_client_uuid: clientUuid,
        name: body.name || 'Unknown',
        phone: body.phone || null,
        email: body.email || null,
        postcode: body.billing_postcode || null,
        address_line1: body.billing_address || null,
        city: body.billing_suburb || null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'sm8_client_uuid', ignoreDuplicates: false }
    );

    await supabase.from('audit_log').insert({
      event_type: 'sm8_client_webhook',
      description: `SM8 webhook: client ${body.name ?? clientUuid} synced`,
      actor: 'system',
      entity_type: 'client',
      metadata: { sm8_client_uuid: clientUuid },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('SM8 webhook error:', err);
    // Return 200 so SM8 doesn't retry; log the error
    return NextResponse.json({ ok: true });
  }
}
