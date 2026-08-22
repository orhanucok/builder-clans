'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { onboardingSchema } from '@/lib/validation/schemas';
import { awardXp } from '@/lib/xp/award';
import { completeOnboardingAction as completeOnboardingDemo } from '@/lib/auth/demo';
import {
  updateProfile, setProfileSkills, setProfileInterests, recordXpEvent,
} from '@/lib/db/store/queries';
import { CANONICAL_SKILLS } from '@/config/matching';

export interface OnboardingResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function completeOnboardingAction(
  input: z.input<typeof onboardingSchema>,
): Promise<OnboardingResult> {
  if (!isSupabaseConfigured()) {
    return completeOnboardingDemo(input as Record<string, unknown>);
  }
  const me = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const data = parsed.data;
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from('profiles')
    .update({
      user_type: data.userType,
      display_name: data.displayName,
      headline: data.headline ?? null,
      bio: data.bio ?? null,
      institution: data.institution ?? null,
      location: data.location ?? null,
      country_code: data.countryCode ?? null,
      weekly_hours: data.weeklyHours,
      remote_preference: 'REMOTE',
      onboarding_completed: true,
    })
    .eq('id', me.id);
  if (error) return { ok: false, error: error.message };

  // Replace skills + interests atomically
  await supabase.from('profile_skills').delete().eq('profile_id', me.id);
  await supabase.from('profile_interests').delete().eq('profile_id', me.id);
  if (data.skills.length) {
    await supabase.from('profile_skills').insert(
      data.skills.map((skill) => ({ profile_id: me.id, skill })),
    );
  }
  if (data.interests.length) {
    await supabase.from('profile_interests').insert(
      data.interests.map((interest) => ({ profile_id: me.id, interest })),
    );
  }

  await awardXp(supabase as never, {
    userId: me.id,
    eventType: 'PROFILE_COMPLETE',
  });

  redirect('/discover');
}
