import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST /api/gemini/improve-email — Improve campaign email copy via Gemini
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.subject && !body.body) {
    return NextResponse.json({ error: 'subject or body required' }, { status: 400 });
  }

  const { improveEmailCopy } = await import('@/lib/gemini');
  const result = await improveEmailCopy(body.subject ?? '', body.body ?? '');

  return NextResponse.json(result);
}
