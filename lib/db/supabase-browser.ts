'use client';

/**
 * Browser-only Supabase client.
 *
 * Kept separate from `lib/db/supabase.ts` so the server-only imports
 * (next/headers) don't leak into the client bundle.
 */

import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

export function createBrowserSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient<Database>(url, key);
}
