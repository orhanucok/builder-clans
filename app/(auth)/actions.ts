'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { signInSchema, signUpSchema } from '@/lib/validation/schemas';
import { getEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { signInAction as signInDemo, signUpAction as signUpDemo, signOutAction as signOutDemo } from '@/lib/auth/demo';

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
 * Sign in. Dispatches to demo backend when Supabase isn't configured, so
 * the app is fully usable in dev without external services.
 */
export async function signInAction(input: z.input<typeof signInSchema>): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return signInDemo(input as Record<string, unknown>);
  }
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
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
 * Sign up. Dispatches to demo backend when Supabase isn't configured.
 */
export async function signUpAction(input: z.input<typeof signUpSchema>): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return signUpDemo(input as Record<string, unknown>);
  }
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join('.');
      fieldErrors[k] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
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
  if (!isSupabaseConfigured()) {
    await signOutDemo();
    return;
  }
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/');
}
