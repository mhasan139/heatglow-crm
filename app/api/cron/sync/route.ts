import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

// POST /api/cron/sync — Hourly SM8 sync (called by Vercel Cron)
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorised triggering
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[cron/sync] Starting hourly SM8 sync');
  const result = await runSync('cron');

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
