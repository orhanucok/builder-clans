/**
 * Auth actions for the (auth) route group.
 *
 * In static export mode these are plain functions called from client
 * components — no server runtime, no Supabase dispatch. Demo flows live in
 * `lib/auth/demo.ts` and are imported here for a stable public surface.
 */

import {
  signInAction as signInDemo,
  signUpAction as signUpDemo,
  signOutAction as signOutDemo,
} from '@/lib/auth/demo';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signInAction(input: Record<string, unknown> | FormData): Promise<ActionResult> {
  return signInDemo(input);
}

export async function signUpAction(input: Record<string, unknown> | FormData): Promise<ActionResult> {
  return signUpDemo(input);
}

export async function signOutAction(): Promise<void> {
  await signOutDemo();
}
