'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { profileUpdateSchema } from '@/lib/validation/schemas';

export interface SettingsResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfileAction(
  input: z.input<typeof profileUpdateSchema>,
): Promise<SettingsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const supabase = await createServerSupabase();
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
  update.updated_at = new Date().toISOString();
  if (Object.keys(update).length > 1) {
    const { error } = await supabase.from('profiles').update(update).eq('id', me.id);
    if (error) return { ok: false, error: error.message };
  }

  if (data.skills) {
    await supabase.from('profile_skills').delete().eq('profile_id', me.id);
    if (data.skills.length) {
      await supabase
        .from('profile_skills')
        .insert(data.skills.map((skill) => ({ profile_id: me.id, skill })));
    }
  }
  if (data.interests) {
    await supabase.from('profile_interests').delete().eq('profile_id', me.id);
    if (data.interests.length) {
      await supabase
        .from('profile_interests')
        .insert(data.interests.map((interest) => ({ profile_id: me.id, interest })));
    }
  }
  revalidatePath('/settings');
  revalidatePath(`/people/${(await supabase.from('profiles').select('username').eq('id', me.id).single()).data?.username ?? ''}`);
  return { ok: true };
}
