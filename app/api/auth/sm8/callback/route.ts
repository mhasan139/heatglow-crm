import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { exchangeCodeForTokens, sm8 } from '@/lib/sm8';

// GET /api/auth/sm8/callback — Handle SM8 OAuth redirect
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.url);

  if (error) {
    settingsUrl.searchParams.set('sm8_error', error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('sm8_error', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  // Verify state matches what we stored
  const storedState = request.cookies.get('sm8_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    settingsUrl.searchParams.set('sm8_error', 'state_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  // Verify user is authenticated admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await sm8.storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);

    const response = NextResponse.redirect(new URL('/settings?sm8=connected', request.url));
    response.cookies.delete('sm8_oauth_state');
    return response;
  } catch (err) {
    console.error('SM8 OAuth callback error:', err);
    settingsUrl.searchParams.set('sm8_error', 'exchange_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
