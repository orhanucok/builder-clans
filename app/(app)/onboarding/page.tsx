import { OnboardingFlow } from './onboarding-flow';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { ensureSeeded } from '@/lib/db/store';
import { getProfileById } from '@/lib/db/store/queries';

export const metadata = { title: 'Welcome to Builder Clans' };

export default async function OnboardingPage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = getProfileById(user.id);
  if (profile?.onboarding_completed) {
    redirect('/discover');
  }

  return (
    <OnboardingFlow
      initialDisplayName={profile?.display_name ?? user.displayName ?? ''}
      initialUsername={profile?.username ?? user.username ?? ''}
    />
  );
}
