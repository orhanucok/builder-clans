import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-10 text-sm text-muted-foreground">
        Configure Supabase to edit your settings.
      </div>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/settings');
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/onboarding');
  const [{ data: skills }, { data: interests }] = await Promise.all([
    supabase.from('profile_skills').select('skill').eq('profile_id', user.id),
    supabase.from('profile_interests').select('interest').eq('profile_id', user.id),
  ]);
  return (
    <div className="container-narrow py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your profile, skills, and what you want to build.
      </p>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm
              profile={{
                display_name: profile.display_name,
                headline: profile.headline,
                bio: profile.bio,
                institution: profile.institution,
                location: profile.location,
                country_code: profile.country_code,
                weekly_hours: profile.weekly_hours,
                user_type: profile.user_type,
                avatar_url: profile.avatar_url,
              }}
              skills={(skills ?? []).map((s) => s.skill as string)}
              interests={(interests ?? []).map((i) => i.interest as string)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
