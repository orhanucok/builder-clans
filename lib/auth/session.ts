/**
 * Auth helpers.
 *
 * Master plan §84-§85: server-side auth check, never trust the client.
 * This module is the only place that reads `auth.getUser()`; route handlers
 * and RSC call `requireUser()` to gate access.
 */

import { redirect } from 'next/navigation';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import type { User } from '@supabase/supabase-js';

export interface SessionUser {
  id: string;
  email: string | null;
  user: User;
}

/**
 * Returns the current user, or null. Safe to call from anywhere.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null, user };
}

/**
 * Returns the current user, or redirects to /login. Use in RSC + actions.
 */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) {
    const target = returnTo
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/login';
    redirect(target);
  }
  return u;
}
