/**
 * Dev-only API: quickly sign in as a seeded persona.
 *
 * GET /api/dev/login?email=defne@builderclans.dev
 *   → Sets the demo session cookie and redirects to /discover.
 *
 * This route is only useful when Supabase is NOT configured (demo mode).
 * In a real deployment it 404s so it can never be abused.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getAuthStore, ensureSeeded } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not available when Supabase is configured.' }, { status: 404 });
  }
  await ensureSeeded();
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing ?email=' }, { status: 400 });
  }
  const auth = getAuthStore();
  const user = auth.getByEmail(email);
  if (!user) {
    return NextResponse.json({ error: `No demo user with email ${email}` }, { status: 404 });
  }
  const token = auth.createSession(user.id);
  const res = NextResponse.redirect(new URL('/discover', req.url));
  const weekSeconds = 60 * 60 * 24 * 7;
  res.cookies.set('bc_demo_session', token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: weekSeconds, secure: false,
  });
  res.cookies.set('bc_demo_user', user.id, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: weekSeconds, secure: false,
  });
  return res;
}
