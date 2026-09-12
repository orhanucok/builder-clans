/**
 * Demo auth — works in both static export and dev. Replaces cookie-based
 * session with localStorage (see lib/auth/client-session.ts).
 *
 * No `'use server'` directive: these functions run wherever they're called.
 * Server components should not import this file directly (no cookies /
 * redirects); client components handle all auth flows.
 */

import {
  getClientSession,
  setClientSession,
  clearClientSession,
} from '@/lib/auth/client-session';
import { getMemoryDb } from '@/lib/db/store/memory';
import {
  upsertProfile,
  setProfileSkills,
  setProfileInterests,
  getProfileById,
  listProfiles,
  updateProfile,
} from '@/lib/db/store/queries';
import { signInSchema, signUpSchema, onboardingSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { CANONICAL_SKILLS } from '@/config/matching';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface DemoAuth {
  // Lightweight demo auth backed by the in-memory store. Passwords are
  // stored alongside users in the seed; this is a demo only.
  createUser(email: string, password: string): { id: string; email: string };
  getByEmail(email: string): { id: string; email: string; password: string } | null;
  getById(id: string): { id: string; email: string } | null;
  verifyPassword(user: { password: string }, password: string): boolean;
  createSession(userId: string): string;
  destroySession(_token: string): void;
  getUserBySession(token: string): { id: string } | null;
}

// Demo auth is stored in a dedicated localStorage key so it survives reloads
// independently of the seeded profile data.
const AUTH_KEY = 'bc.demo.auth';

interface DemoAuthBlob {
  users: Array<{ id: string; email: string; password: string }>;
  sessions: Array<{ token: string; userId: string; createdAt: number }>;
}

function loadBlob(): DemoAuthBlob {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { users: [], sessions: [] };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { users: [], sessions: [] };
    return JSON.parse(raw) as DemoAuthBlob;
  } catch {
    return { users: [], sessions: [] };
  }
}

function saveBlob(blob: DemoAuthBlob): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(blob));
  } catch {
    /* ignore */
  }
}

export function getDemoAuth(): DemoAuth {
  return {
    createUser(email, password) {
      const blob = loadBlob();
      const id = `usr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      const user = { id, email, password };
      blob.users.push(user);
      saveBlob(blob);
      return { id: user.id, email: user.email };
    },
    getByEmail(email) {
      const blob = loadBlob();
      return blob.users.find((u) => u.email === email) ?? null;
    },
    getById(id) {
      const blob = loadBlob();
      const u = blob.users.find((u) => u.id === id);
      return u ? { id: u.id, email: u.email } : null;
    },
    verifyPassword(user, password) {
      return user.password === password;
    },
    createSession(userId) {
      const blob = loadBlob();
      const token = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      blob.sessions.push({ token, userId, createdAt: Date.now() });
      saveBlob(blob);
      return token;
    },
    destroySession(token) {
      const blob = loadBlob();
      blob.sessions = blob.sessions.filter((s) => s.token !== token);
      saveBlob(blob);
    },
    getUserBySession(token) {
      const blob = loadBlob();
      const s = blob.sessions.find((x) => x.token === token);
      return s ? { id: s.userId } : null;
    },
  };
}

/**
 * Look up the current user from the client session. Returns null when there
 * is no session, the session has expired, or the user no longer exists.
 */
export function getCurrentClientUser(): {
  id: string;
  email: string;
  displayName: string;
  username: string;
} | null {
  const session = getClientSession();
  if (!session) return null;
  const profile = getProfileById(session.userId);
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email ?? '',
    displayName: profile.display_name ?? profile.username ?? 'Builder',
    username: profile.username ?? profile.id.slice(0, 8),
  };
}

export async function signInAction(input: FormData | Record<string, unknown>): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(parseInput(input));
  if (!parsed.success) return zodErrorResult(parsed.error);
  const auth = getDemoAuth();
  const user = auth.getByEmail(parsed.data.email);
  if (!user) return { ok: false, error: 'No account with this email. Try signing up.' };
  if (!auth.verifyPassword(user, parsed.data.password)) {
    return { ok: false, error: 'Wrong password. Try again.' };
  }
  setClientSession(user.id);
  // Make sure the session token is also valid in the demo-auth store so that
  // server-side helpers (if any are accidentally hit during the transition)
  // can find the user.
  auth.createSession(user.id);
  return { ok: true };
}

export async function signUpAction(input: FormData | Record<string, unknown>): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(parseInput(input));
  if (!parsed.success) return zodErrorResult(parsed.error);

  const auth = getDemoAuth();
  if (auth.getByEmail(parsed.data.email)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  const baseUsername = parsed.data.email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'user';
  const existing = new Set(listProfiles().map((p) => p.username));
  let username = baseUsername;
  let n = 1;
  while (existing.has(username)) {
    username = `${baseUsername}${n}`;
    n++;
  }

  const user = auth.createUser(parsed.data.email, parsed.data.password);
  upsertProfile({
    id: user.id,
    username,
    display_name: parsed.data.displayName ?? username,
    email: parsed.data.email,
    onboarding_completed: false,
  });
  setClientSession(user.id);
  auth.createSession(user.id);
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const session = getClientSession();
  if (session) getDemoAuth().destroySession(session.token);
  clearClientSession();
}

export async function switchPersonaAction(personaEmail: string): Promise<ActionResult> {
  // Look up the persona across the seeded profile data — the legacy
  // `bc.demo.auth` localStorage blob only has demo signups, so it misses the
  // 30 seeded demo accounts. Profiles always include email, so we use them
  // as the canonical persona map.
  const { ensureSeeded } = await import('@/lib/db/store/seed');
  const { getMemoryDb } = await import('@/lib/db/store/memory');
  await ensureSeeded();
  const profile = getMemoryDb().profiles.findOne(
    (p) => (p as { email: string | null }).email?.toLowerCase() === personaEmail.toLowerCase(),
  );
  if (!profile) return { ok: false, error: `No demo persona with email ${personaEmail}.` };
  setClientSession((profile as { id: string }).id);
  return { ok: true };
}

export async function completeOnboardingAction(rawData: Record<string, unknown>): Promise<ActionResult> {
  const session = getClientSession();
  if (!session) return { ok: false, error: 'Not signed in.' };
  const parsed = onboardingSchema.safeParse(rawData);
  if (!parsed.success) return zodErrorResult(parsed.error);
  const profile = getProfileById(session.userId);
  if (!profile) return { ok: false, error: 'Profile not found.' };

  const skills = Array.isArray(parsed.data.skills)
    ? (parsed.data.skills as string[])
    : String(parsed.data.skills ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const interests = Array.isArray(parsed.data.interests)
    ? (parsed.data.interests as string[])
    : String(parsed.data.interests ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const knownSkills = new Set(CANONICAL_SKILLS as readonly string[]);
  const validSkills = skills.filter((s) => knownSkills.has(s));
  const validInterests = interests.filter((i) => i.length > 0);

  updateProfile(session.userId, {
    display_name: parsed.data.displayName,
    username: parsed.data.username || profile.username,
    headline: parsed.data.headline ?? null,
    bio: parsed.data.bio ?? null,
    user_type: (parsed.data.userType as never) ?? null,
    institution: parsed.data.institution ?? null,
    location: parsed.data.location ?? null,
    country_code: parsed.data.countryCode ?? null,
    timezone: parsed.data.timezone ?? null,
    weekly_hours: (parsed.data.weeklyHours as never) ?? null,
    remote_preference: (parsed.data.remotePreference as never) ?? null,
    onboarding_completed: true,
  });
  setProfileSkills(session.userId, validSkills);
  setProfileInterests(session.userId, validInterests);
  return { ok: true };
}

function parseInput(input: FormData | Record<string, unknown>): Record<string, unknown> {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    const out: Record<string, unknown> = {};
    input.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  return input;
}

function zodErrorResult(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join('.');
    if (!fieldErrors[k]) fieldErrors[k] = issue.message;
  }
  return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
}

// Silence unused-import warnings during the server-to-client transition. The
// memory DB import keeps tree-shaking honest about which modules are still
// used by the rest of the codebase.
void getMemoryDb;
