'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
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

/**
 * Create a project. The owner becomes the first project_member of type OWNER.
 */
export async function createProjectAction(input: unknown): Promise<ProjectActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured.' };
  const me = await requireUser();
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
  const supabase = await createServerSupabase();

  // Make sure slug is unique
  let slug = slugify(data.title);
  let suffix = 0;
  // attempt a few times; if still conflict, append a short id
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data: dup } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!dup) {
      slug = candidate;
      break;
    }
    suffix += 1;
    if (suffix > 50) {
      slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 7)}`;
      break;
    }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      owner_id: me.id,
      slug,
      title: data.title,
      short_description: data.shortDescription,
      description: data.fullDescription,
      category: data.category,
      stage: data.stage,
      visibility: data.visibility,
      remote_mode: data.remoteMode,
      location: data.location ?? null,
      weekly_commitment_min: data.weeklyCommitmentMin,
      weekly_commitment_max: data.weeklyCommitmentMax,
      github_url: data.githubUrl ?? null,
      demo_url: data.demoUrl ?? null,
      website_url: data.websiteUrl ?? null,
      tags: data.tags,
      status: 'ACTIVE',
    })
    .select('id, slug')
    .single();
  if (error) return { ok: false, error: error.message };

  // Add owner as project member
  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: me.id,
    member_type: 'OWNER',
    status: 'ACTIVE',
  });

  // Skills
  if (data.requiredSkills.length) {
    await supabase.from('project_skills').insert(
      data.requiredSkills.map((skill) => ({ project_id: project.id, skill })),
    );
  }

  // First project XP (idempotent)
  const { data: myProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', me.id);
  if (myProjects && myProjects.length === 1) {
    await awardXp(supabase as never, { userId: me.id, eventType: 'FIRST_PROJECT' });
  }

  revalidatePath('/projects');
  revalidatePath('/discover');
  redirect(`/projects/${slug}`);
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured.' };
  const me = await requireUser();
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const supabase = await createServerSupabase();
  // Owner check
  const { data: proj } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();
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
  update.updated_at = new Date().toISOString();

  const { error } = await supabase.from('projects').update(update).eq('id', projectId);
  if (error) return { ok: false, error: error.message };

  if (data.requiredSkills !== undefined) {
    await supabase.from('project_skills').delete().eq('project_id', projectId);
    if (data.requiredSkills.length) {
      await supabase
        .from('project_skills')
        .insert(data.requiredSkills.map((skill) => ({ project_id: projectId, skill })));
    }
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
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const { data: proj } = await supabase
    .from('projects')
    .select('id, owner_id, status')
    .eq('id', projectId)
    .single();
  if (!proj) return { ok: false, error: 'Project not found.' };
  if (proj.owner_id !== me.id) return { ok: false, error: 'Only the owner can ship.' };
  if (proj.status === 'COMPLETED') return { ok: true };

  await supabase
    .from('projects')
    .update({ status: 'COMPLETED', stage: 'LAUNCHED', updated_at: new Date().toISOString() })
    .eq('id', projectId);

  // Award XP to every active member
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE');
  for (const m of members ?? []) {
    await awardXp(supabase as never, {
      userId: m.user_id as string,
      eventType: 'PROJECT_SHIPPED',
      entityType: 'project',
      entityId: projectId,
    });
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
