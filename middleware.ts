/**
 * Builder Clans — Edge middleware
 *
 * Responsibilities:
 *  1. Refresh the Supabase auth session for every request (so the user
 *     doesn't get logged out while the tab is open) when Supabase is
 *     configured.
 *  2. In demo mode (no Supabase env) check the demo session cookie and
 *     redirect unauthenticated requests on protected routes to /login.
 *  3. Redirect already-authenticated users away from /login and /signup.
 *
 * Note: route protection is also enforced server-side in every RSC and
 * server action. This middleware is a UX optimization, not a security
 * boundary.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PROTECTED_PREFIXES = [
  '/onboarding',
  '/projects',
  '/matches',
  '/trials',
  '/workspace',
  '/people/edit',
  '/settings',
  '/notifications',
  '/clans',
  '/leaderboard',
];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const DEMO_SESSION_COOKIE = 'bc_demo_session';
const DEMO_USER_COOKIE = 'bc_demo_user';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsAuth = isProtected(pathname);

  // Check whether Supabase is configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Demo mode: gate on the demo session cookie
    const sessionToken = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
    const userId = request.cookies.get(DEMO_USER_COOKIE)?.value;
    const isAuthed = Boolean(sessionToken && userId);
    if (needsAuth && !isAuthed) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('returnTo', `${pathname}${search}`);
      return NextResponse.redirect(redirectUrl);
    }
    if (isAuthed && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
    return NextResponse.next({ request });
  }

  // Supabase mode: refresh session and gate
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsAuth && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/discover', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
