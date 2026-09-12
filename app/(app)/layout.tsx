'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientAuthGuard } from '@/components/layout/client-auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { KeyboardShortcuts } from '@/components/layout/keyboard-shortcuts';
import { CommandPalette } from '@/components/layout/command-palette';
import { SetupBanner } from '@/components/layout/setup-banner';
import { WelcomeBanner } from '@/components/layout/welcome-banner';
import { hydrate } from '@/lib/db/store/persistence';
import { ensureSeeded } from '@/lib/db/store/seed';
import { getCurrentClientUser, switchPersonaAction } from '@/lib/auth/demo';
import { isFeatureEnabled } from '@/config/feature-flags';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email: string | null;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; slug: string; title: string; shortDescription: string; ownerUsername: string; ownerDisplayName: string }>>([]);
  const [people, setPeople] = useState<Array<{ id: string; username: string; displayName: string; headline: string | null }>>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrate();
      await ensureSeeded();
      if (cancelled) return;
      // Demo auto-login: `?demo=<persona-email>` signs the visitor in as that
      // persona in one step. Useful for shared URLs, screen recordings, and
      // ad-hoc QA. No-op in production if no demo email is supplied.
      const demo = searchParams?.get('demo');
      if (demo) {
        await switchPersonaAction(demo);
      }
      const u = getCurrentClientUser();
      if (u) {
        const { getProfileById, listSavedProjectsForUser } = await import('@/lib/db/store/queries');
        const { getMemoryDb } = await import('@/lib/db/store/memory');
        const profile = getProfileById(u.id);
        setUser({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          username: u.username,
          avatarUrl: profile?.avatar_url ?? null,
        });
        setSavedCount(listSavedProjectsForUser(u.id).length);
        setIsNewUser(
          Boolean(profile && (!profile.onboarding_completed || (!profile.headline && !profile.bio))),
        );
        const db = getMemoryDb() as unknown as {
          projects: { all(): Array<{ id: string; slug: string; title: string; short_description: string | null; owner_id: string }> };
          profiles: { all(): Array<{ id: string; username: string; display_name: string; headline: string | null }> };
        };
        const allProjects = db.projects.all().slice(0, 60);
        const ownerIds = new Set(allProjects.map((p) => p.owner_id));
        const ownerMap = new Map(
          db.profiles.all().filter((p) => ownerIds.has(p.id)),
        );
        const projectItems: typeof projects = [];
        for (const p of allProjects) {
          const owner = ownerMap.get(p.owner_id);
          projectItems.push({
            id: p.id,
            slug: p.slug,
            title: p.title,
            shortDescription: p.short_description ?? '',
            ownerUsername: owner?.username ?? 'unknown',
            ownerDisplayName: owner?.display_name ?? 'Unknown',
          });
          if (projectItems.length >= 20) break;
        }
        setProjects(projectItems);
        const profileItems: typeof people = db.profiles
          .all()
          .slice(0, 30)
          .map((p) => ({
            id: p.id,
            username: p.username,
            displayName: p.display_name,
            headline: p.headline,
          }));
        setPeople(profileItems);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading Builder Clansâ€¦
      </div>
    );
  }

  return (
    <ClientAuthGuard>
      <div className="min-h-screen bg-background">
        <SetupBanner />
        {user && isNewUser ? <WelcomeBanner /> : null}
        <div className="flex min-h-screen">
          <Sidebar
            user={user}
            flags={{
              clans: isFeatureEnabled('CLANS'),
              leaderboard: isFeatureEnabled('LEADERBOARD'),
              nativeChat: isFeatureEnabled('NATIVE_CHAT'),
            }}
            savedCount={savedCount}
            unreadCount={0}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              user={user}
              notifications={[]}
              unreadCount={0}
              flags={{
                clans: isFeatureEnabled('CLANS'),
                leaderboard: isFeatureEnabled('LEADERBOARD'),
                nativeChat: isFeatureEnabled('NATIVE_CHAT'),
              }}
              savedCount={savedCount}
            />
            <main className="flex-1 pb-16">{children}</main>
          </div>
        </div>
        <KeyboardShortcuts isAuthenticated={Boolean(user)} />
        <CommandPalette
          isAuthenticated={Boolean(user)}
          isDemo={true}
          projects={projects}
          people={people}
        />
      </div>
    </ClientAuthGuard>
  );
}
