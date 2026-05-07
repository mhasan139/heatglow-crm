import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/cron/gdpr-anonymise — Runs 1st of month at 2am UTC
// Anonymises rejected enquiries older than 12 months
// Overwrites customer_name, phone, email with [ANONYMISED]
// Keeps ai_score, postcode, created_at for analytics
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const cutoff12m = new Date();
  cutoff12m.setFullYear(cutoff12m.getFullYear() - 1);
  const cutoff = cutoff12m.toISOString();

  // Find rejected/expired enquiries older than 12 months with real data still present
  const { data: toAnonymise, error } = await supabase
    .from('enquiries')
    .select('id, customer_name')
    .in('status', ['Rejected', 'Expired'])
    .lte('created_at', cutoff)
    .not('customer_name', 'eq', '[ANONYMISED]')
    .is('deleted_at', null)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!toAnonymise || toAnonymise.length === 0) {
    return NextResponse.json({ ok: true, anonymised: 0 });
  }

  const ids = toAnonymise.map((e) => e.id);

  await supabase
    .from('enquiries')
    .update({
      customer_name: '[ANONYMISED]',
      phone: '[ANONYMISED]',
      email: '[ANONYMISED]',
      referral_name: null,
      internal_notes: null,
    })
    .in('id', ids);

  await supabase.from('audit_log').insert({
    event_type: 'gdpr_anonymised',
    entity_type: 'enquiry',
    entity_id: null,
    description: `GDPR anonymisation: ${toAnonymise.length} enquiries anonymised`,
    actor: 'cron',
    metadata: { count: toAnonymise.length, ids },
  });

  return NextResponse.json({ ok: true, anonymised: toAnonymise.length });
}
