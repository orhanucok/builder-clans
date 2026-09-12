/**
 * Settings actions — plain functions usable from client components.
 */

import { z } from 'zod';
import { ensureSeeded } from '@/lib/db/store/seed';
import {
  updateProfile,
  setProfileSkills,
  setProfileInterests,
  getProfileById,
} from '@/lib/db/store/queries';
import { profileUpdateSchema } from '@/lib/validation/schemas';
import { getCurrentClientUser } from '@/lib/auth/demo';

export interface SettingsResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfileAction(
  input: z.input<typeof profileUpdateSchema>,
): Promise<SettingsResult> {
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
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
  void getProfileById(me.id);
  return { ok: true };
}
