/**
 * Supabase client factories (server-only).
 *
 * For browser usage, import `createBrowserSupabase` from
 * `lib/db/supabase-browser.ts`. The browser file is kept separate so the
 * `next/headers` import below doesn't leak into the client bundle.
 *
 * Server clients:
 *   - createServerSupabase(): for RSC, route handlers, server actions (cookies)
 *   - createServiceSupabase(): server-only, bypasses RLS (admin jobs)
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getEnv, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

// Re-exported for convenience so callers can import both from one place.
export { isSupabaseConfigured };

const SUPABASE_NOT_CONFIGURED =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.';

/**
 * Server client — uses the request cookies. Call from RSC / route handler.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_NOT_CONFIGURED);
  }
  const env = getEnv();
  const cookieStore = cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. Server-only.
 * Use sparingly: seeding, admin actions, scheduled jobs.
 */
export function createServiceSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_NOT_CONFIGURED);
  }
  const env = getEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client.');
  }
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
