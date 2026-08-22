'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded } from '@/lib/db/store';
import {
  updateProfile, setProfileSkills, setProfileInterests, getProfileById,
} from '@/lib/db/store/queries';
import { profileUpdateSchema } from '@/lib/validation/schemas';

export interface SettingsResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfileAction(
  input: z.input<typeof profileUpdateSchema>,
): Promise<SettingsResult> {
  const me = await requireUser();
  await ensureSeeded();
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const data = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.userType) update.user_type = data.userType;
  if (data.displayName) update.display_name = data.displayName;
  if (data.headline !== undefined) update.headline = data.headline ?? null;
  if (data.bio !== undefined) update.bio = data.bio ?? null;
  if (data.institution !== undefined) update.institution = data.institution ?? null;
  if (data.location !== undefined) update.location = data.location ?? null;
  if (data.countryCode) update.country_code = data.countryCode;
  if (data.weeklyHours) update.weekly_hours = data.weeklyHours;
  if (data.avatarUrl) update.avatar_url = data.avatarUrl;
  if (Object.keys(update).length > 0) {
    updateProfile(me.id, update as never);
  }
  if (data.skills) setProfileSkills(me.id, data.skills);
  if (data.interests) setProfileInterests(me.id, data.interests);
  const profile = getProfileById(me.id);
  revalidatePath('/settings');
  if (profile) revalidatePath(`/people/${profile.username}`);
  return { ok: true };
}
