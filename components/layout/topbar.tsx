'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hammer, LogOut, Search, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOutAction } from '@/app/(auth)/actions';
import { switchPersonaAction } from '@/lib/auth/demo';
import { NotificationBell, type NotificationSummary } from './notification-bell';
import { MobileSidebarSheet } from './mobile-sidebar';

interface TopbarProps {
  user: { displayName: string; username: string; avatarUrl: string | null } | null;
  notifications: NotificationSummary[];
  unreadCount: number;
  flags: { clans: boolean; leaderboard: boolean; nativeChat: boolean };
  savedCount?: number;
}

export function Topbar({ user, notifications, unreadCount, flags, savedCount }: TopbarProps) {
  const [search, setSearch] = useState('');
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur md:gap-3 md:px-6">
      {/* Mobile-only hamburger + brand */}
      <div className="flex items-center gap-2 md:hidden">
        <MobileSidebarSheet
          user={user}
          flags={flags}
          savedCount={savedCount}
          unreadCount={unreadCount}
        />
        <Link href="/discover" className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-background">
            <Hammer className="h-3.5 w-3.5" />
          </span>
          <span>Builder Clans</span>
        </Link>
      </div>

      <form
        className="flex w-full max-w-md items-center"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `/search?q=${encodeURIComponent(search)}`;
        }}
      >
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects, people, skills…  (press /)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
            aria-label="Global search"
          />
        </div>
      </form>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
          isAuthenticated={Boolean(user)}
        />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <Avatar className="h-7 w-7">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                  <AvatarFallback name={user.displayName} />
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={`/people/${user.username}`}
                  className="flex items-center gap-2"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <PersonaSwitcher />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form
                action={async () => {
                  await signOutAction();
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

/**
 * Inline component that switches the demo persona in localStorage and reloads
 * the page so every dependent view (sidebar counts, topbar avatar, etc.)
 * re-fetches against the new identity.
 */
function PersonaSwitcher() {
  const router = useRouter();
  const onClick = async () => {
    await switchPersonaAction('defne@builderclans.dev');
    router.refresh();
    router.push('/discover');
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <User className="h-3.5 w-3.5" />
      <span>Switch persona (demo)</span>
    </button>
  );
}
