import { OnboardingFlow } from './onboarding-flow';
import { getCurrentUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Welcome to Builder Clans' };

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-20">
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Onboarding is available once Supabase is configured. Set <code>.env.local</code> and restart the
          dev server.
        </div>
      </div>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // If already complete, skip onboarding.
  const { createServerSupabase } = await import('@/lib/db/supabase');
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, display_name, username')
    .eq('id', user.id)
    .single();
  if (profile?.onboarding_completed) {
    redirect('/discover');
  }

  return (
    <OnboardingFlow
      initialDisplayName={profile?.display_name ?? user.user.user_metadata?.display_name ?? ''}
      initialUsername={profile?.username ?? user.user.user_metadata?.username ?? ''}
    />
  );
}
