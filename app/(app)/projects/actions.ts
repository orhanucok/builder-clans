'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded } from '@/lib/db/store';
import {
  createProject, updateProject, getProjectById, getProjectBySlug,
  setProjectSkills, addProjectMember, listProjects,
} from '@/lib/db/store/queries';
import { projectCreateSchema, projectUpdateSchema } from '@/lib/validation/schemas';
import { slugify } from '@/lib/utils';
import { awardXp } from '@/lib/xp/award';

export interface ProjectActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  slug?: string;
  id?: string;
}

export async function createProjectAction(input: unknown): Promise<ProjectActionResult> {
  const me = await requireUser();
  await ensureSeeded();
  const parsed = projectCreateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const data = parsed.data;
  if (data.weeklyCommitmentMin > data.weeklyCommitmentMax) {
    return { ok: false, error: 'Minimum commitment cannot exceed maximum.' };
  }

  // Make sure slug is unique
  let slug = slugify(data.title);
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    if (!getProjectBySlug(candidate)) {
      slug = candidate;
      break;
    }
    suffix += 1;
    if (suffix > 50) {
      slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 7)}`;
      break;
    }
  }

  const project = createProject({
    owner_id: me.id,
    slug,
    title: data.title,
    short_description: data.shortDescription,
    description: data.fullDescription,
    category: data.category as never,
    stage: data.stage as never,
    visibility: data.visibility as never,
    remote_mode: data.remoteMode as never,
    location: data.location ?? null,
    weekly_commitment_min: data.weeklyCommitmentMin,
    weekly_commitment_max: data.weeklyCommitmentMax,
    github_url: data.githubUrl ?? null,
    demo_url: data.demoUrl ?? null,
    website_url: data.websiteUrl ?? null,
    tags: data.tags,
    status: 'ACTIVE',
  });

  addProjectMember(project.id, me.id, 'OWNER', 'Founder');

  if (data.requiredSkills.length) {
    setProjectSkills(project.id, data.requiredSkills);
  }

  // First project XP (idempotent)
  const myProjects = listProjects({ ownerId: me.id, limit: 100 });
  if (myProjects.length === 1) {
    await awardXp(null, { userId: me.id, eventType: 'FIRST_PROJECT' });
  }

  revalidatePath('/projects');
  revalidatePath('/discover');
  redirect(`/projects/${slug}`);
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const me = await requireUser();
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const proj = getProjectById(projectId);
  if (!proj || proj.owner_id !== me.id) return { ok: false, error: 'Not allowed.' };
  const data = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.shortDescription !== undefined) update.short_description = data.shortDescription;
  if (data.fullDescription !== undefined) update.description = data.fullDescription;
  if (data.category !== undefined) update.category = data.category;
  if (data.stage !== undefined) update.stage = data.stage;
  if (data.visibility !== undefined) update.visibility = data.visibility;
  if (data.remoteMode !== undefined) update.remote_mode = data.remoteMode;
  if (data.location !== undefined) update.location = data.location ?? null;
  if (data.weeklyCommitmentMin !== undefined) update.weekly_commitment_min = data.weeklyCommitmentMin;
  if (data.weeklyCommitmentMax !== undefined) update.weekly_commitment_max = data.weeklyCommitmentMax;
  if (data.githubUrl !== undefined) update.github_url = data.githubUrl ?? null;
  if (data.demoUrl !== undefined) update.demo_url = data.demoUrl ?? null;
  if (data.websiteUrl !== undefined) update.website_url = data.websiteUrl ?? null;
  if (data.tags !== undefined) update.tags = data.tags;

  updateProject(projectId, update as never);

  if (data.requiredSkills !== undefined) {
    setProjectSkills(projectId, data.requiredSkills);
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/**
 * Mark a project as SHIPPED. Awards big XP to the team.
 */
export async function markProjectShippedAction(
  projectId: string,
): Promise<ProjectActionResult> {
  const me = await requireUser();
  const proj = getProjectById(projectId);
  if (!proj) return { ok: false, error: 'Project not found.' };
  if (proj.owner_id !== me.id) return { ok: false, error: 'Only the owner can ship.' };
  if (proj.status === 'COMPLETED') return { ok: true };

  updateProject(projectId, { status: 'COMPLETED', stage: 'LAUNCHED' } as never);

  // Award XP to every active member
  const { db } = await import('@/lib/db/store');
  const members = db.project_members.list({ project_id: projectId, status: 'ACTIVE' });
  for (const m of members) {
    await awardXp(null, {
      userId: m.user_id,
      eventType: 'PROJECT_SHIPPED',
      entityType: 'project',
      entityId: projectId,
    });
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
