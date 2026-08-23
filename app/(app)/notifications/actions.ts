'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded } from '@/lib/db/store';
import {
  listNotificationsForUser, markNotificationRead, getProfileById,
} from '@/lib/db/store/queries';

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
  const me = await requireUser();
  const list = listNotificationsForUser(me.id, { limit });
  const unread = listNotificationsForUser(me.id, { unreadOnly: true, limit: 100 }).length;
  return {
    ok: true,
    notifications: list.map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body, link: n.link,
      readAt: n.read_at, createdAt: n.created_at,
    })),
    unreadCount: unread,
  };
}

export async function markAllReadAction(): Promise<{ ok: boolean; error?: string; marked: number }> {
  await ensureSeeded();
  const me = await requireUser();
  const all = listNotificationsForUser(me.id, { unreadOnly: true, limit: 200 });
  for (const n of all) {
    markNotificationRead(n.id);
  }
  revalidatePath('/notifications');
  return { ok: true, marked: all.length };
}

export async function markOneReadAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSeeded();
  const me = await requireUser();
  const note = db_getNotification(id, me.id);
  if (!note) return { ok: false, error: 'Notification not found.' };
  markNotificationRead(id);
  revalidatePath('/notifications');
  return { ok: true };
}

// Small helper to keep the call-site readable.
function db_getNotification(id: string, userId: string) {
  const n = listNotificationsForUser(userId, { limit: 500 }).find((x) => x.id === id);
  return n ?? null;
}
