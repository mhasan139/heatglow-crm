import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { runSync } from '@/lib/sync';

// Rate limit: once per 10 minutes per user
const syncCooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 60 * 1000;

// POST /api/sm8/sync — Manual sync trigger from Settings page
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Enforce cooldown
  const lastSync = syncCooldowns.get(user.id) ?? 0;
  const elapsed = Date.now() - lastSync;
  if (elapsed < COOLDOWN_MS) {
    const waitSecs = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return NextResponse.json(
      { error: `Sync rate limited. Wait ${waitSecs}s before retrying.` },
      { status: 429 }
    );
  }

  syncCooldowns.set(user.id, Date.now());

  const result = await runSync('manual');
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
