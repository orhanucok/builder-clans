'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelative } from '@/lib/utils';
import { getCurrentClientUser } from '@/lib/auth/demo';
import { ensureSeeded } from '@/lib/db/store/seed';
import { listNotificationsForUser } from '@/lib/db/store/queries';
import { markAllReadAction } from './actions';
import type { NotificationType } from '@/config/constants';

const FILTERS: Array<{ key: 'ALL' | NotificationType; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'MATCH_SUGGESTED', label: 'Match suggestions' },
  { key: 'MATCH_DECIDED', label: 'Match decisions' },
  { key: 'APPLICATION_RECEIVED', label: 'Applications' },
  { key: 'TRIAL_KICKED_OFF', label: 'Trial started' },
  { key: 'TRIAL_COMPLETED', label: 'Trial completed' },
  { key: 'WEEKLY_SUMMARY_READY', label: 'Weekly summary' },
];

interface NotifRow {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [all, setAll] = useState<NotifRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeeded();
      const u = getCurrentClientUser();
      if (!u) {
        if (!cancelled) {
          setSignedIn(false);
          setReady(true);
        }
        return;
      }
      const rows = listNotificationsForUser(u.id, { limit: 200 });
      if (!cancelled) {
        setSignedIn(true);
        setAll(rows);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFilter = ((searchParams?.type ?? 'ALL') as 'ALL' | NotificationType);
  const visible = activeFilter === 'ALL' ? all : all.filter((n) => n.type === activeFilter);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('ALL', all.length);
    for (const n of all) map.set(n.type, (map.get(n.type) ?? 0) + 1);
    return map;
  }, [all]);

  async function onMarkAll() {
    await markAllReadAction();
    setAll((cur) => cur.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="container-narrow grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
        Loading notifications…
      </div>
    );
  }

  if (!signedIn) {
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
          <Button onClick={onMarkAll} variant="outline" size="sm">
            <Check className="h-3.5 w-3.5" /> Mark all read
          </Button>
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
                'inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium transition-colors',
                active ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-foreground/5',
              )}
            >
              <span>{f.label}</span>
              <Badge variant={active ? 'secondary' : 'outline'} className="px-1.5 py-0 text-[10px]">
                {count}
              </Badge>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="Nothing to see here"
          description="When something happens — a match, an application, a trial update — you'll see it here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((n) => {
            const unread = !n.read_at;
            const inner = (
              <Card className={cn(unread && 'border-primary/40 bg-primary/5')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                        unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelative(n.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
