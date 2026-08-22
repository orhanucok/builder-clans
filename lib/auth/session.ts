/**
 * Auth helpers.
 *
 * Master plan §84-§85: server-side auth check, never trust the client.
 * This module is the only place that reads auth state; route handlers
 * and RSC call `requireUser()` to gate access.
 *
 * Currently the app runs entirely on the in-memory demo auth store. When
 * Supabase support is added, the dispatch will go here.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthStore, ensureSeeded } from '@/lib/db/store';
import { getProfileById } from '@/lib/db/store/queries';
import type { User } from '@supabase/supabase-js';

const DEMO_SESSION_COOKIE = 'bc_demo_session';
const DEMO_USER_COOKIE = 'bc_demo_user';

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  username: string;
  user: User | { id: string; email: string; isDemo: true };
}

/**
 * Returns the current user, or null. Safe to call from anywhere.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return getDemoUser();
}

export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) {
    const target = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
    redirect(target);
  }
  return u;
}

async function getDemoUser(): Promise<SessionUser | null> {
  await ensureSeeded();
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  const userId = cookieStore.get(DEMO_USER_COOKIE)?.value;
  if (!sessionToken || !userId) return null;
  const auth = getAuthStore();
  const user = auth.getById(userId);
  if (!user) return null;
  if (auth.getUserBySession(sessionToken)?.id !== user.id) return null;
  const profile = getProfileById(user.id);
  return {
    id: user.id,
    email: user.email,
    displayName: profile?.display_name ?? user.email,
    username: profile?.username ?? user.email.split('@')[0],
    user: { id: user.id, email: user.email, isDemo: true as const } as unknown as User,
  };
}

export { DEMO_SESSION_COOKIE, DEMO_USER_COOKIE };
