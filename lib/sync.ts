/**
 * SM8 → CRM sync engine.
 * Called by the hourly cron and the manual "Sync Now" button.
 */
import { sm8, type SM8Client, type SM8Job } from './sm8';
import { createServiceClient } from './supabase';

const SERVICE_AREA_POSTCODES = [
  'CF3', 'CF5', 'CF10', 'CF11', 'CF14', 'CF15',
  'CF23', 'CF24', 'CF38', 'CF62', 'CF63', 'CF64', 'CF83',
];

function postcodeArea(postcode: string): string {
  return postcode.trim().toUpperCase().split(' ')[0].replace(/\d+$/, '');
}

export interface SyncResult {
  success: boolean;
  records_updated: number;
  error?: string;
}

export async function runSync(triggeredBy: 'cron' | 'manual'): Promise<SyncResult> {
  const supabase = createServiceClient();

  // Create sync_log row (running)
  const { data: syncRow } = await supabase
    .from('sync_log')
    .insert({ started_at: new Date().toISOString(), status: 'running', triggered_by: triggeredBy })
    .select('id')
    .single();

  const syncId = syncRow?.id;
  let recordsUpdated = 0;

  try {
    // 1. Find HeatShield category UUID (cache in settings)
    const { data: hsCacheSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'sm8_heatshield_category_uuid')
      .single();

    let heatshieldCategoryUuid = hsCacheSetting?.value || '';

    if (!heatshieldCategoryUuid) {
      const categories = await sm8.getClientCategories();
      const hsCategory = categories.find(
        (c) => c.name.toLowerCase().includes('heatshield')
      );
      if (hsCategory) {
        heatshieldCategoryUuid = hsCategory.uuid;
        await supabase
          .from('settings')
          .upsert({ key: 'sm8_heatshield_category_uuid', value: heatshieldCategoryUuid })
          .eq('key', 'sm8_heatshield_category_uuid');
      }
    }

    // 2. Fetch all SM8 clients (paginated, 500/page)
    let page = 1;
    let hasMore = true;
    const allClients: SM8Client[] = [];

    while (hasMore) {
      const pageClients = await sm8.getClients(page);
      allClients.push(...pageClients);
      hasMore = pageClients.length === 500;
      page++;
    }

    // 3. Batch upsert clients (100 per batch)
    const BATCH_SIZE = 100;
    for (let i = 0; i < allClients.length; i += BATCH_SIZE) {
      const batch = allClients.slice(i, i + BATCH_SIZE);
      const rows = batch.map((c) => {
        const categoryUuids = c.category_uuids
          ? c.category_uuids.split(',').map((u) => u.trim())
          : [];
        const isHeatshield =
          !!heatshieldCategoryUuid && categoryUuids.includes(heatshieldCategoryUuid);

        // Build known_contacts from phone + email
        const knownContacts: { type: string; value: string }[] = [];
        if (c.phone) knownContacts.push({ type: 'phone', value: c.phone });
        if (c.email) knownContacts.push({ type: 'email', value: c.email });

        return {
          sm8_client_uuid: c.uuid,
          name: c.name,
          phone: c.phone || null,
          email: c.email || null,
          postcode: c.billing_postcode || null,
          address_line1: c.billing_address || null,
          city: c.billing_suburb || null,
          is_heatshield: isHeatshield,
          heatshield_category_uuid: isHeatshield ? heatshieldCategoryUuid : null,
          known_contacts: knownContacts,
          last_synced_at: new Date().toISOString(),
        };
      });

      await supabase
        .from('clients')
        .upsert(rows, { onConflict: 'sm8_client_uuid', ignoreDuplicates: false });

      recordsUpdated += batch.length;
    }

    // 4. Fetch and upsert all jobs
    const jobs = await sm8.getJobs();
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);

      // Resolve client_id for each job
      const clientUuids = [...new Set(batch.map((j) => j.company_uuid).filter(Boolean))];
      const { data: clientRows } = await supabase
        .from('clients')
        .select('id, sm8_client_uuid')
        .in('sm8_client_uuid', clientUuids);

      const clientIdMap = Object.fromEntries(
        (clientRows ?? []).map((r) => [r.sm8_client_uuid, r.id])
      );

      const jobRows = batch.map((j) => ({
        sm8_job_uuid: j.uuid,
        client_id: clientIdMap[j.company_uuid] ?? null,
        sm8_client_uuid: j.company_uuid || null,
        sm8_status: j.status || null,
        invoice_amount: j.total_excluding_tax ?? null,
        job_date: j.job_date || null,
        description: j.note || null,
        job_type: j.type || null,
        sm8_job_url: `https://go.servicem8.com/app#job,${j.uuid}`,
        last_synced_at: new Date().toISOString(),
      }));

      await supabase
        .from('jobs')
        .upsert(jobRows, { onConflict: 'sm8_job_uuid', ignoreDuplicates: false });

      recordsUpdated += batch.length;
    }

    // 5. Recalculate total_spend and job_count per client
    await recalculateClientMetrics(supabase);

    // 6. Update last_job_date per client
    await updateLastJobDates(supabase);

    // 7. Mark sync complete
    if (syncId) {
      await supabase
        .from('sync_log')
        .update({ status: 'success', completed_at: new Date().toISOString(), records_updated: recordsUpdated })
        .eq('id', syncId);
    }

    return { success: true, records_updated: recordsUpdated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('SM8 sync error:', message);

    if (syncId) {
      await supabase
        .from('sync_log')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: message })
        .eq('id', syncId);
    }

    // Check for 3rd consecutive failure → alert Gareth
    await checkConsecutiveFailures(supabase, message);

    return { success: false, records_updated: recordsUpdated, error: message };
  }
}

async function recalculateClientMetrics(supabase: ReturnType<typeof createServiceClient>) {
  // Use a raw SQL-style approach via Supabase RPC if available,
  // otherwise do it in batches. Here we use a simple aggregate query.
  const { data: metrics } = await supabase
    .from('jobs')
    .select('client_id, invoice_amount, sm8_status')
    .is('deleted_at', null)
    .not('client_id', 'is', null);

  if (!metrics) return;

  // Group by client_id
  const clientMetrics: Record<number, { spend: number; count: number }> = {};
  for (const job of metrics) {
    if (!job.client_id) continue;
    if (!clientMetrics[job.client_id]) {
      clientMetrics[job.client_id] = { spend: 0, count: 0 };
    }
    clientMetrics[job.client_id].count++;
    if (job.invoice_amount && job.sm8_status !== 'Cancelled') {
      clientMetrics[job.client_id].spend += Number(job.invoice_amount);
    }
  }

  // Batch update clients
  const BATCH = 50;
  const entries = Object.entries(clientMetrics);
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await Promise.all(
      batch.map(([clientId, { spend, count }]) =>
        supabase
          .from('clients')
          .update({ total_spend: spend, job_count: count })
          .eq('id', Number(clientId))
      )
    );
  }
}

async function updateLastJobDates(supabase: ReturnType<typeof createServiceClient>) {
  const { data: latestJobs } = await supabase
    .from('jobs')
    .select('client_id, job_date')
    .is('deleted_at', null)
    .not('client_id', 'is', null)
    .not('job_date', 'is', null)
    .order('job_date', { ascending: false });

  if (!latestJobs) return;

  const latestByClient: Record<number, string> = {};
  for (const job of latestJobs) {
    if (!job.client_id || !job.job_date) continue;
    if (!latestByClient[job.client_id]) {
      latestByClient[job.client_id] = job.job_date;
    }
  }

  const entries = Object.entries(latestByClient);
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);
    await Promise.all(
      batch.map(([clientId, lastJobDate]) =>
        supabase
          .from('clients')
          .update({ last_job_date: lastJobDate })
          .eq('id', Number(clientId))
      )
    );
  }
}

async function checkConsecutiveFailures(
  supabase: ReturnType<typeof createServiceClient>,
  message: string
) {
  const { data: recentLogs } = await supabase
    .from('sync_log')
    .select('status')
    .order('started_at', { ascending: false })
    .limit(3);

  if (!recentLogs) return;

  const allFailed = recentLogs.length >= 3 && recentLogs.every((l) => l.status === 'failed');
  if (allFailed) {
    // Alert Gareth — import lazily to avoid circular deps
    const { sendSystemAlert } = await import('./resend');
    await sendSystemAlert(
      `SM8 sync has failed 3 consecutive times. Last error: ${message}. Please check your SM8 API key and connection in Settings.`
    );
  }
}

export { SERVICE_AREA_POSTCODES, postcodeArea };
