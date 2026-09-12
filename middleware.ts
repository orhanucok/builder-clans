/**
 * Middleware is a no-op in static export mode.
 *
 * The original middleware enforced the demo session cookie and redirected
 * unauthenticated requests to /login. In static export there is no per-request
 * runtime, so all gating is now done by client components (see
 * `components/layout/client-auth-guard.tsx`).
 */

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Match nothing — the middleware function never runs in this build.
  matcher: [],
};
