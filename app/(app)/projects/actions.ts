/**
 * Project actions — plain functions usable from client components.
 * Mutations return their result; navigation happens in the client (router.push).
 */

import { ensureSeeded } from '@/lib/db/store/seed';
import { getMemoryDb } from '@/lib/db/store/memory';
import {
  createProject,
  updateProject,
  getProjectById,
  getProjectBySlug,
  setProjectSkills,
  addProjectMember,
  listProjects,
} from '@/lib/db/store/queries';
import { projectCreateSchema, projectUpdateSchema } from '@/lib/validation/schemas';
import { slugify } from '@/lib/utils';
import { awardXp } from '@/lib/xp/award';
import { getCurrentClientUser } from '@/lib/auth/demo';

export interface ProjectActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  slug?: string;
  id?: string;
}

export async function createProjectAction(input: unknown): Promise<ProjectActionResult> {
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
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

  let slug = slugify(data.title);
  let suffix = 0;
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
    cover_image_url: data.coverImageUrl || null,
    tags: data.tags,
    status: 'ACTIVE',
  });

  addProjectMember(project.id, me.id, 'OWNER', 'Founder');

  if (data.requiredSkills.length) {
    setProjectSkills(project.id, data.requiredSkills);
  }

  const myProjects = listProjects({ ownerId: me.id, limit: 100 });
  if (myProjects.length === 1) {
    await awardXp(null, { userId: me.id, eventType: 'FIRST_PROJECT' });
  }

  return { ok: true, slug, id: project.id };
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
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
  return { ok: true };
}

export async function markProjectShippedAction(projectId: string): Promise<ProjectActionResult> {
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
  const proj = getProjectById(projectId);
  if (!proj) return { ok: false, error: 'Project not found.' };
  if (proj.owner_id !== me.id) return { ok: false, error: 'Only the owner can ship.' };
  if (proj.status === 'COMPLETED') return { ok: true };

  updateProject(projectId, { status: 'COMPLETED', stage: 'LAUNCHED' } as never);

  const members = getMemoryDb().project_members.list({ project_id: projectId, status: 'ACTIVE' });
  for (const m of members) {
    await awardXp(null, {
      userId: m.user_id,
      eventType: 'PROJECT_SHIPPED',
      entityType: 'project',
      entityId: projectId,
    });
  }
  return { ok: true };
}
