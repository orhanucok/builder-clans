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
  if (!user) {
    // Allow demo access when Supabase is not configured.
    if (!isSupabaseConfigured()) {
      // Render the shell in demo mode; pages that need auth will soft-fail.
    } else {
      redirect('/login');
    }
  }

  const showSetupBanner = !isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-background">
      {showSetupBanner && <SetupBanner />}
      <div className="flex min-h-screen">
        <Sidebar
          user={
            user
              ? { displayName: user.user.user_metadata?.display_name ?? 'Builder', username: user.user.user_metadata?.username ?? user.id.slice(0, 8) }
              : null
          }
          flags={{
            clans: isFeatureEnabled('CLANS'),
            leaderboard: isFeatureEnabled('LEADERBOARD'),
            nativeChat: isFeatureEnabled('NATIVE_CHAT'),
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user ? { displayName: user.user.user_metadata?.display_name ?? 'Builder', username: user.user.user_metadata?.username ?? user.id.slice(0, 8), avatarUrl: null } : null} />
          <main className="flex-1 pb-16">{children}</main>
        </div>
      </div>
    </div>
  );
}
