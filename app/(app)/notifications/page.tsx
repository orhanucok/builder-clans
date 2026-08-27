import Link from 'next/link';
import { Bell, Check, Inbox } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { ensureSeeded } from '@/lib/db/store';
import { listNotificationsForUser } from '@/lib/db/store/queries';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelative } from '@/lib/utils';
import { markAllReadAction } from './actions';
import type { NotificationType } from '@/config/constants';

export const metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

const FILTERS: Array<{ key: 'ALL' | NotificationType; label: string; }> = [
  { key: 'ALL', label: 'All' },
  { key: 'MATCH_SUGGESTED', label: 'Match suggestions' },
  { key: 'MATCH_DECIDED', label: 'Match decisions' },
  { key: 'APPLICATION_RECEIVED', label: 'Applications' },
  { key: 'TRIAL_KICKED_OFF', label: 'Trial started' },
  { key: 'TRIAL_COMPLETED', label: 'Trial completed' },
  { key: 'WEEKLY_SUMMARY_READY', label: 'Weekly summary' },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-narrow py-10">
        <EmptyState
          title="Log in to see your notifications"
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const all = listNotificationsForUser(user.id, { limit: 200 });
  const activeFilter = (searchParams.type ?? 'ALL') as 'ALL' | NotificationType;
  const filtered = activeFilter === 'ALL' ? all : all.filter((n) => n.type === activeFilter);

  // Count per type for the filter chips
  const counts = new Map<string, number>();
  counts.set('ALL', all.length);
  for (const n of all) {
    counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
  }

  return (
    <div className="container-narrow py-8">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {all.length} total · {all.filter((n) => !n.read_at).length} unread
          </p>
        </div>
        {all.some((n) => !n.read_at) ? (
          <form
            action={async () => {
              'use server';
              await markAllReadAction();
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              <Check className="h-3.5 w-3.5" /> Mark all read
            </Button>
          </form>
        ) : null}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const count = counts.get(f.key) ?? 0;
          if (count === 0 && f.key !== 'ALL') return null;
          const active = activeFilter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === 'ALL' ? '/notifications' : `/notifications?type=${f.key}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {f.label}
              <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-background/20' : 'bg-muted')}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title={activeFilter === 'ALL' ? "You're all caught up" : 'Nothing in this filter yet'}
          description={
            activeFilter === 'ALL'
              ? 'When someone applies, invites, or reviews you, it will show up here.'
              : 'Switch to a different filter or clear it to see other notifications.'
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={cn('transition-colors', !n.read_at && 'border-foreground/30 bg-primary/5')}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read_at ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                    ) : (
                      <span className="h-2 w-2 shrink-0" />
                    )}
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <Badge variant="muted" className="ml-auto text-[10px]">
                      {n.type.toLowerCase().replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {n.body ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelative(n.created_at)}
                  </p>
                </div>
                {n.link ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={n.link}>Open</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
