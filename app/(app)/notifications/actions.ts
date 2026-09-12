/**
 * Notification actions — plain functions usable from client components.
 * No `'use server'` directive because we run inside static export. Pages
 * that mutate notifications should call router.refresh() after success.
 */

import { ensureSeeded } from '@/lib/db/store/seed';
import {
  listNotificationsForUser,
  markNotificationRead,
} from '@/lib/db/store/queries';
import { getCurrentClientUser } from '@/lib/auth/demo';

export interface NotificationSummary {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResult {
  ok: boolean;
  error?: string;
  notifications: NotificationSummary[];
  unreadCount: number;
}

export async function getTopNotificationsAction(limit = 8): Promise<NotificationsResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.', notifications: [], unreadCount: 0 };
  const list = listNotificationsForUser(me.id, { limit });
  const unread = listNotificationsForUser(me.id, { unreadOnly: true, limit: 100 }).length;
  return {
    ok: true,
    notifications: list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    unreadCount: unread,
  };
}

export async function markAllReadAction(): Promise<{ ok: boolean; error?: string; marked: number }> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.', marked: 0 };
  const all = listNotificationsForUser(me.id, { unreadOnly: true, limit: 200 });
  for (const n of all) {
    markNotificationRead(n.id);
  }
  return { ok: true, marked: all.length };
}

export async function markOneReadAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
  const note = listNotificationsForUser(me.id, { limit: 500 }).find((x) => x.id === id);
  if (!note) return { ok: false, error: 'Notification not found.' };
  markNotificationRead(id);
  return { ok: true };
}
