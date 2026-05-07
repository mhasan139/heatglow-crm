import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { djangoFetch } from '@/lib/django';

function esc(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await djangoFetch('/api/v1/heatshield/?page_size=2000');
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: any[] = json.data ?? [];

  const headers = [
    'Name', 'Phone', 'Email', 'Postcode',
    'Status', 'Last Service Date', 'Next Service Due',
    'Monthly Amount (£)', 'Days Since Service', 'Service Due',
    'Sign-up Date',
  ];

  const rows = members.map((m) => [
    m.client_name,
    m.client_phone,
    m.client_email,
    m.client_postcode,
    m.status,
    m.last_service_date,
    m.next_service_due,
    m.monthly_amount,
    m.days_since_service,
    m.service_due_flag ? 'Yes' : 'No',
    typeof m.created_at === 'string' ? m.created_at.split('T')[0] : '',
  ].map(esc).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const date = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="heatshield-members-${date}.csv"`,
    },
  });
}
