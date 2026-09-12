import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { ensureSeeded } from '@/lib/db/store';
import { getProfileById, getProfileSkills, getProfileInterests } from '@/lib/db/store/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/settings');
  const profile = getProfileById(user.id);
  if (!profile) redirect('/onboarding');
  const skills = getProfileSkills(user.id);
  const interests = getProfileInterests(user.id);
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
              skills={skills}
              interests={interests}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
