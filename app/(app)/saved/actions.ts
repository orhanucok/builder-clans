/**
 * Saved-projects actions — plain functions usable from client components.
 */

import { ensureSeeded } from '@/lib/db/store/seed';
import { getMemoryDb } from '@/lib/db/store/memory';
import {
  listSavedProjectsForUser,
  saveProjectBookmark,
  removeSavedProject,
} from '@/lib/db/store/queries';
import { getCurrentClientUser } from '@/lib/auth/demo';

export interface SavedResult {
  ok: boolean;
  error?: string;
  saved: boolean;
}

export async function toggleSaveProjectAction(projectId: string): Promise<SavedResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.', saved: false };
  const project = getMemoryDb().projects.get(projectId) as { slug: string } | null;
  if (!project) return { ok: false, error: 'Project not found.', saved: false };
  const current = listSavedProjectsForUser(me.id);
  if (current.some((s) => s.project_id === projectId)) {
    removeSavedProject(me.id, projectId);
    return { ok: true, saved: false };
  }
  saveProjectBookmark(me.id, projectId);
  return { ok: true, saved: true };
}

export async function getSavedProjectIdsAction(): Promise<string[]> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return [];
  return listSavedProjectsForUser(me.id).map((s) => s.project_id);
}
