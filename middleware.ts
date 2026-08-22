/**
 * Builder Clans — Edge middleware
 *
 * Responsibilities:
 *  1. Refresh the Supabase auth session for every request (so the user
 *     doesn't get logged out while the tab is open).
 *  2. Redirect unauthenticated requests on protected routes to /login
 *     with a `returnTo` param.
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
  '/people', // public profile view is OK; but `/people/.../edit` would be protected if added
  '/settings',
  '/notifications',
];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Only run on routes that need it.
  const needsAuth = isProtected(pathname);

  // Quick env check: if Supabase is not configured, just let the request
  // through. The (app) layout will render the demo mode UI.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next({ request });
  }

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

  // Refresh the session — this also returns the current user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsAuth && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  // If the user is signed in and hits /login or /signup, send them to /discover.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/discover', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
