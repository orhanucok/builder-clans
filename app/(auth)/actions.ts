'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { signInSchema, signUpSchema } from '@/lib/validation/schemas';
import { getEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function getClientIp(): string {
  const h = headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'anonymous'
  );
}

/**
 * Sign in. Server action — used by the login form.
 */
export async function signInAction(input: z.input<typeof signInSchema>): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured. Add credentials in .env.local.' };
  }
  const rl = rateLimit(`signin:${getClientIp()}`, 10);
  if (!rl.allowed) {
    return { ok: false, error: 'Too many attempts. Please try again in a minute.' };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Sign up. Server action — used by the signup form. On success, ensures a
 * profile row exists for the new user.
 */
export async function signUpAction(input: z.input<typeof signUpSchema>): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join('.');
      fieldErrors[k] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured. Add credentials in .env.local.' };
  }
  const rl = rateLimit(`signup:${getClientIp()}`, 5);
  if (!rl.allowed) {
    return { ok: false, error: 'Too many attempts. Please try again in a minute.' };
  }

  const env = getEnv();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/onboarding`,
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName,
      },
    },
  });
  if (error) return { ok: false, error: error.message };

  // Create the profile row (in case email confirmation is disabled and the
  // user is signed in immediately).
  if (data.user) {
    await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        username: parsed.data.username,
        display_name: parsed.data.displayName,
        onboarding_completed: false,
      },
      { onConflict: 'id' },
    );
  }
  return { ok: true };
}

/**
 * Sign out.
 */
export async function signOutAction() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/');
}
