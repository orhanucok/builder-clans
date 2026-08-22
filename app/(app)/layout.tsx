import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { SetupBanner } from '@/components/layout/setup-banner';
import { isFeatureEnabled } from '@/config/feature-flags';

// Auth-bound pages must render per-request. We never want a stale
// unauthenticated shell to be served as a static asset.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user && isSupabaseConfigured()) {
    redirect('/login');
  }

  const showSetupBanner = !isSupabaseConfigured();

  // In demo mode, the (app) layout still renders for signed-in users.
  // In Supabase mode, also requires a user.
  const headerUser = user
    ? {
        displayName: user.displayName || 'Builder',
        username: user.username || user.id.slice(0, 8),
        avatarUrl: null as string | null,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      {showSetupBanner && <SetupBanner />}
      <div className="flex min-h-screen">
        <Sidebar
          user={headerUser}
          flags={{
            clans: isFeatureEnabled('CLANS'),
            leaderboard: isFeatureEnabled('LEADERBOARD'),
            nativeChat: isFeatureEnabled('NATIVE_CHAT'),
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={headerUser} />
          <main className="flex-1 pb-16">{children}</main>
        </div>
      </div>
    </div>
  );
}
