/**
 * Auth types + thin server-side shim.
 *
 * Static export has no server runtime, so the cookie-based demo session that
 * lived here has been moved to `lib/auth/client-session.ts`. For actual auth
 * checks, import `getCurrentClientUser` from `@/lib/auth/demo` and run it
 * in a `useEffect` (or a top-level client check).
 *
 * This file remains only so existing types re-export cleanly without
 * forcing every page to be rewritten as a client component.
 */

import type { User } from '@supabase/supabase-js';

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  username: string;
  user: User | { id: string; email: string; isDemo: true };
}

/**
 * Returns the current user, or null. On the server during static export this
 * always returns null (no request, no cookies). On the client, prefer
 * `getCurrentClientUser()` from `@/lib/auth/demo`.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return null;
}

export async function requireUser(_returnTo?: string): Promise<SessionUser> {
  throw new Error(
    'requireUser is not available in static export mode. Use a client-side auth guard.',
  );
}
