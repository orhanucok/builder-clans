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
  Trophy,
  Users,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  user: { displayName: string; username: string } | null;
  flags: { clans: boolean; leaderboard: boolean; nativeChat: boolean };
}

const NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
}> = [
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/projects', label: 'My projects', icon: LayoutGrid },
  { href: '/matches', label: 'Matches', icon: Sparkles },
  { href: '/trials', label: 'Trials', icon: Hammer },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/clans', label: 'Clans', icon: Users, hidden: true /* feature flag */ },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, hidden: true },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ user, flags }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-card/30 px-3 py-5 md:flex">
      <Link href="/discover" className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
          <Hammer className="h-4 w-4" />
        </span>
        Builder Clans
      </Link>

      <Button asChild size="sm" className="mb-4">
        <Link href="/projects/new" className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>New project</span>
        </Link>
      </Button>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          if (item.href === '/clans' && !flags.clans) return null;
          if (item.href === '/leaderboard' && !flags.leaderboard) return null;
          const active =
            pathname === item.href ||
            (item.href !== '/discover' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground/5 text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        {user ? (
          <Link
            href={`/people/${user.username}`}
            className="flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-foreground/5"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback name={user.displayName} />
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </Link>
        ) : (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
