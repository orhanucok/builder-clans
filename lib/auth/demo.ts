/**
 * Demo auth actions — sign-up, sign-in, sign-out for the in-memory backend.
 *
 * Used when Supabase env is not configured. Real Supabase auth lives in
 * app/(auth)/actions.ts which calls into the Supabase clients. This module
 * keeps the demo experience on par with the real one so users can actually
 * use the app without provisioning Supabase.
 */

'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthStore, ensureSeeded } from '@/lib/db/store';
import {
  upsertProfile, setProfileSkills, setProfileInterests,
} from '@/lib/db/store/queries';
import { DEMO_SESSION_COOKIE, DEMO_USER_COOKIE } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { signInSchema, signUpSchema, onboardingSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { CANONICAL_SKILLS } from '@/config/matching';

const ONE_WEEK = 60 * 60 * 24 * 7;

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export async function signInAction(formData: FormData | Record<string, unknown>): Promise<ActionResult> {
  if (!isDemoMode()) {
    return { ok: false, error: 'Demo sign-in is only available when Supabase is not configured.' };
  }
  await ensureSeeded();
  const parsed = signInSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return zodErrorResult(parsed.error);

  const auth = getAuthStore();
  const user = auth.getByEmail(parsed.data.email);
  if (!user) return { ok: false, error: 'No account with this email. Try signing up.' };
  if (!auth.verifyPassword(user, parsed.data.password)) {
    return { ok: false, error: 'Wrong password. Try again or reset it.' };
  }
  await startDemoSession(user.id);
  return { ok: true };
}

export async function signUpAction(formData: FormData | Record<string, unknown>): Promise<ActionResult> {
  if (!isDemoMode()) {
    return { ok: false, error: 'Demo sign-up is only available when Supabase is not configured.' };
  }
  await ensureSeeded();
  const parsed = signUpSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return zodErrorResult(parsed.error);

  const auth = getAuthStore();
  if (auth.getByEmail(parsed.data.email)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  // Create a username from the email local-part if not provided
  const baseUsername = parsed.data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
  const existingUsernames = new Set(
    (await import('@/lib/db/store/queries')).listProfiles().map((p) => p.username),
  );
  let username = baseUsername;
  let n = 1;
  while (existingUsernames.has(username)) {
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

  await startDemoSession(user.id);
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  if (!isDemoMode()) return;
  const cookieStore = cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (token) {
    getAuthStore().destroySession(token);
  }
  cookieStore.delete(DEMO_SESSION_COOKIE);
  cookieStore.delete(DEMO_USER_COOKIE);
  redirect('/');
}

export async function switchPersonaAction(personaEmail: string): Promise<ActionResult> {
  if (!isDemoMode()) {
    return { ok: false, error: 'Persona switching is only available in demo mode.' };
  }
  await ensureSeeded();
  const auth = getAuthStore();
  const user = auth.getByEmail(personaEmail);
  if (!user) return { ok: false, error: `No demo persona with email ${personaEmail}.` };
  await startDemoSession(user.id);
  return { ok: true };
}

export async function completeOnboardingAction(
  rawData: Record<string, unknown>,
): Promise<ActionResult> {
  if (!isDemoMode()) {
    return { ok: false, error: 'Demo onboarding is only available in demo mode.' };
  }
  await ensureSeeded();
  const user = await requireDemoUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const parsed = onboardingSchema.safeParse(rawData);
  if (!parsed.success) return zodErrorResult(parsed.error);

  const profile = (await import('@/lib/db/store/queries')).getProfileById(user.id);
  if (!profile) return { ok: false, error: 'Profile not found.' };

  // Skills come in as a comma-separated list of canonical names. We store them as-is;
  // matching is done against CANONICAL_SKILLS anyway.
  const skills = Array.isArray(parsed.data.skills)
    ? (parsed.data.skills as string[])
    : String(parsed.data.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const interests = Array.isArray(parsed.data.interests)
    ? (parsed.data.interests as string[])
    : String(parsed.data.interests ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  const knownSkills = new Set(CANONICAL_SKILLS as readonly string[]);
  const validSkills = skills.filter((s) => knownSkills.has(s));
  const validInterests = interests.filter((i) => i.length > 0);

  (await import('@/lib/db/store/queries')).updateProfile(user.id, {
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
  setProfileSkills(user.id, validSkills);
  setProfileInterests(user.id, validInterests);
  return { ok: true };
}

// ---------------------------------------------------------------------------

async function startDemoSession(userId: string): Promise<void> {
  const token = getAuthStore().createSession(userId);
  const cookieStore = cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: ONE_WEEK, secure: process.env.NODE_ENV === 'production',
  });
  cookieStore.set(DEMO_USER_COOKIE, userId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: ONE_WEEK, secure: process.env.NODE_ENV === 'production',
  });
}

async function requireDemoUser(): Promise<{ id: string; email: string } | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  const userId = cookieStore.get(DEMO_USER_COOKIE)?.value;
  if (!sessionToken || !userId) return null;
  const auth = getAuthStore();
  const user = auth.getById(userId);
  if (!user) return null;
  if (auth.getUserBySession(sessionToken)?.id !== user.id) return null;
  return { id: user.id, email: user.email };
}

function parseFormData(input: FormData | Record<string, unknown>): Record<string, unknown> {
  if (input instanceof FormData) {
    const out: Record<string, unknown> = {};
    input.forEach((v, k) => { out[k] = v; });
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
