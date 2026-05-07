import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase';

// DELETE /api/activity?event_type=sync.failed — Permanently delete entries by event_type
export async function DELETE(request: NextRequest) {
  // Auth check via user client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventType = new URL(request.url).searchParams.get('event_type') ?? 'sync.failed';

  // Use service role client to bypass RLS for the delete
  const admin = createServiceClient();
  const { error } = await admin
    .from('audit_log')
    .delete()
    .eq('event_type', eventType);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET /api/activity — Recent audit log entries (for 60-second polling)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '12'));

  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
