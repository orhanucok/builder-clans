'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { cn, formatRelative } from '@/lib/utils';
import {
  getTopNotificationsAction, markAllReadAction, markOneReadAction,
  type NotificationSummary,
} from '@/app/(app)/notifications/actions';

const POLL_INTERVAL_MS = 15_000;

interface NotificationBellProps {
  initialNotifications: NotificationSummary[];
  initialUnreadCount: number;
  isAuthenticated: boolean;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
  isAuthenticated,
}: NotificationBellProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Polling
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const refresh = async () => {
      const res = await getTopNotificationsAction(8);
      if (cancelled) return;
      if (res.ok) {
        setNotifications(res.notifications);
        setUnread(res.unreadCount);
      }
    };
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [isAuthenticated]);

  function markAll() {
    startTransition(async () => {
      const res = await markAllReadAction();
      if (!res.ok) {
        toast({ title: 'Could not mark read', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: `${res.marked} notification${res.marked === 1 ? '' : 's'} marked as read` });
      const refreshed = await getTopNotificationsAction(8);
      if (refreshed.ok) {
        setNotifications(refreshed.notifications);
        setUnread(0);
      }
    });
  }

  function openOne(n: NotificationSummary) {
    if (!n.readAt) {
      startTransition(async () => {
        await markOneReadAction(n.id);
        setNotifications((cur) => cur.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
        setUnread((u) => Math.max(0, u - 1));
      });
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          open && 'bg-accent text-foreground',
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <div className="text-sm font-semibold">Notifications</div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <Inbox className="mx-auto mb-2 h-6 w-6" />
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openOne(n)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                        !n.readAt && 'bg-primary/5',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {!n.readAt ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : (
                          <span className="h-1.5 w-1.5 shrink-0" />
                        )}
                        <span className="line-clamp-1 text-sm font-medium">{n.title}</span>
                      </div>
                      {n.body ? (
                        <p className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">{n.body}</p>
                      ) : null}
                      <div className="pl-3.5 text-[10px] text-muted-foreground">
                        {formatRelative(n.createdAt)} · {n.type.toLowerCase().replace(/_/g, ' ')}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-foreground hover:underline"
            >
              See all
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
