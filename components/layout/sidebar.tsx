'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Hammer,
  LayoutGrid,
  Plus,
  Settings,
  Sparkles,
  Users,
  Activity,
  Bookmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  user: { displayName: string; username: string; avatarUrl: string | null } | null;
  flags: { clans: boolean; leaderboard: boolean; nativeChat: boolean };
  savedCount?: number;
  unreadCount?: number;
  className?: string;
  onNavigate?: () => void;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
  badgeKey?: 'saved' | 'unread';
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Build',
    items: [
      { href: '/discover', label: 'Discover', icon: Compass },
      { href: '/projects', label: 'My projects', icon: LayoutGrid },
      { href: '/matches', label: 'Matches', icon: Sparkles, badgeKey: 'unread' },
      { href: '/trials', label: 'Trials', icon: Hammer },
      { href: '/saved', label: 'Saved', icon: Bookmark, badgeKey: 'saved' },
    ],
  },
  {
    label: 'Network',
    items: [
      { href: '/people', label: 'People', icon: Users },
      { href: '/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    label: 'Personal',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

export function Sidebar({ user, flags, savedCount, unreadCount, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const badgeFor = (key: NavItem['badgeKey']) => {
    if (key === 'saved' && savedCount && savedCount > 0) return savedCount;
    if (key === 'unread' && unreadCount && unreadCount > 0) return unreadCount;
    return null;
  };
  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/30 px-3 py-5',
        // On the (app) layout we keep desktop always visible and hide mobile by default;
        // the mobile sheet renders the same content via <MobileSidebarSheet>.
        'max-md:hidden',
        className,
      )}
    >
      <Link
        href="/discover"
        onClick={onNavigate}
        className="mb-5 flex items-center gap-2 px-2 text-sm font-semibold"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
          <Hammer className="h-4 w-4" />
        </span>
        Builder Clans
      </Link>

      <Button asChild size="sm" className="mb-4">
        <Link href="/projects/new" onClick={onNavigate} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>New project</span>
        </Link>
      </Button>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => {
            if (item.href === '/clans' && !flags.clans) return false;
            if (item.href === '/leaderboard' && !flags.leaderboard) return false;
            return true;
          });
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {visible.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== '/discover' && (pathname?.startsWith(item.href) ?? false));
                  const badge = badgeFor(item.badgeKey);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-foreground/5 text-foreground'
                          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge ? (
                        <span
                          className={cn(
                            'ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                            item.badgeKey === 'unread'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-3">
        {user ? (
          <Link
            href={`/people/${user.username}`}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-foreground/5"
          >
            <Avatar className="h-8 w-8">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
              <AvatarFallback name={user.displayName} />
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </Link>
        ) : (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/login" onClick={onNavigate}>
              Log in
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
