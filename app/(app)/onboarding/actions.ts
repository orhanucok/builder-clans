/**
 * Onboarding actions — plain functions usable from client components.
 * The actual mutation logic lives in `lib/auth/demo.ts` (single source of
 * truth across auth + onboarding).
 */

import { z } from 'zod';
import { onboardingSchema } from '@/lib/validation/schemas';
import { completeOnboardingAction as completeOnboardingDemo } from '@/lib/auth/demo';

export interface OnboardingResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function completeOnboardingAction(
  input: z.input<typeof onboardingSchema>,
): Promise<OnboardingResult> {
  return completeOnboardingDemo(input as Record<string, unknown>);
}
