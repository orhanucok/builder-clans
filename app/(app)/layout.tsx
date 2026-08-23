import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { ensureSeeded } from '@/lib/db/store';
import { listNotificationsForUser } from '@/lib/db/store/queries';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { SetupBanner } from '@/components/layout/setup-banner';
import { KeyboardShortcuts } from '@/components/layout/keyboard-shortcuts';
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

  // Topbar notification data: prefetch the most recent 8 + unread count.
  // The client component then polls for changes.
  let initialNotifications: ReturnType<typeof listNotificationsForUser> = [];
  let initialUnread = 0;
  if (user) {
    await ensureSeeded();
    initialNotifications = listNotificationsForUser(user.id, { limit: 8 });
    initialUnread = listNotificationsForUser(user.id, { unreadOnly: true, limit: 100 }).length;
  }

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
          <Topbar
            user={headerUser}
            notifications={initialNotifications.map((n) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              body: n.body,
              link: n.link,
              readAt: n.read_at,
              createdAt: n.created_at,
            }))}
            unreadCount={initialUnread}
          />
          <main className="flex-1 pb-16">{children}</main>
        </div>
      </div>
      <KeyboardShortcuts isAuthenticated={Boolean(user)} />
    </div>
  );
}
