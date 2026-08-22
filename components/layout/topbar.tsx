'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, LogOut, Search, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOutAction } from '@/app/(auth)/actions';

interface TopbarProps {
  user: { displayName: string; username: string; avatarUrl: string | null } | null;
}

export function Topbar({ user }: TopbarProps) {
  const [search, setSearch] = useState('');
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur md:px-6">
      <form
        className="flex w-full max-w-md items-center"
        onSubmit={(e) => {
          e.preventDefault();
          // basic search → /discover
          window.location.href = `/discover?q=${encodeURIComponent(search)}`;
        }}
      >
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects, people, skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
            aria-label="Global search"
          />
        </div>
      </form>
      <div className="ml-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" aria-label="Notifications">
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <Avatar className="h-7 w-7">
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
