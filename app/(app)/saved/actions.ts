'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded, db } from '@/lib/db/store';
import { listSavedProjectsForUser, saveProjectBookmark, removeSavedProject } from '@/lib/db/store/queries';

export interface SavedResult {
  ok: boolean;
  error?: string;
  saved: boolean;
}

export async function toggleSaveProjectAction(projectId: string): Promise<SavedResult> {
  await ensureSeeded();
  const me = await requireUser();
  const project = db.projects.get(projectId);
  if (!project) return { ok: false, error: 'Project not found.', saved: false };
  const current = listSavedProjectsForUser(me.id);
  if (current.some((s) => s.project_id === projectId)) {
    removeSavedProject(me.id, projectId);
    revalidatePath('/saved');
    revalidatePath(`/projects/${project.slug}`);
    return { ok: true, saved: false };
  }
  saveProjectBookmark(me.id, projectId);
  revalidatePath('/saved');
  revalidatePath(`/projects/${project.slug}`);
  return { ok: true, saved: true };
}

export async function getSavedProjectIdsAction(): Promise<string[]> {
  await ensureSeeded();
  const me = await requireUser();
  return listSavedProjectsForUser(me.id).map((s) => s.project_id);
}
