import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

interface ImportRow {
  phone?: string;
  email?: string;
  last_service_date: string;
  monthly_amount?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rows: ImportRow[];
  try { rows = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  const results: Array<{
    row: number;
    identifier: string;
    status: 'success' | 'not_found' | 'already_member' | 'error';
    name?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const identifier = row.phone || row.email || `Row ${i + 1}`;

    if (!row.last_service_date) {
      results.push({ row: i + 1, identifier, status: 'error', error: 'Missing last_service_date' });
      continue;
    }

    // Search for matching client by phone or email
    const searchTerm = row.phone || row.email || '';
    const clientRes = await djangoFetch(`/api/v1/clients/?search=${encodeURIComponent(searchTerm)}&page_size=1`);
    if (!clientRes.ok) {
      results.push({ row: i + 1, identifier, status: 'error', error: 'Client search failed' });
      continue;
    }

    const clientJson = await clientRes.json();
    const client = clientJson.data?.[0];
    if (!client) {
      results.push({ row: i + 1, identifier, status: 'not_found' });
      continue;
    }

    // Create HeatShield membership
    const memberRes = await djangoFetch('/api/v1/heatshield/', {
      method: 'POST',
      body: JSON.stringify({
        client: client.client_id,
        last_service_date: row.last_service_date,
        monthly_amount: parseFloat(row.monthly_amount ?? '10') || 10,
      }),
    });

    if (!memberRes.ok) {
      const err = await memberRes.json();
      const isAlready = (err.message ?? '').toLowerCase().includes('already');
      results.push({
        row: i + 1,
        identifier,
        name: client.name,
        status: isAlready ? 'already_member' : 'error',
        error: isAlready ? undefined : (err.message ?? 'Failed to create'),
      });
    } else {
      results.push({ row: i + 1, identifier, name: client.name, status: 'success' });
    }
  }

  return NextResponse.json({ results });
}
