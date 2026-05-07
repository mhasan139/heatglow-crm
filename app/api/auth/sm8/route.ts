import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { buildSM8AuthUrl } from '@/lib/sm8';
import crypto from 'crypto';

// GET /api/auth/sm8 — Start SM8 OAuth flow
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const state = crypto.randomBytes(16).toString('hex');

  // Store state in a short-lived cookie (verified in callback)
  const authUrl = buildSM8AuthUrl(state);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('sm8_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
