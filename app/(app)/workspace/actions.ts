'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { resolveProjectPermissions } from '@/lib/permissions/checks';
import {
  taskCreateSchema,
  milestoneCreateSchema,
  projectUpdateCreateSchema,
  artifactCreateSchema,
  contributionCreateSchema,
} from '@/lib/validation/schemas';
import { canTransition, StatusMachines } from '@/config/transitions';
import { awardXp } from '@/lib/xp/award';
import { aiWeeklySummary } from '@/lib/ai/features';
import type { TaskStatus, MilestoneStatus } from '@/config/constants';

export interface WsResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// Tasks

export async function createTaskAction(
  projectId: string,
  input: z.input<typeof taskCreateSchema>,
): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, projectId);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  const parsed = taskCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      milestone_id: parsed.data.milestoneId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignee_id: parsed.data.assigneeId ?? null,
      due_date: parsed.data.dueDate ? parsed.data.dueDate.toISOString() : null,
      created_by: me.id,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true, id: data?.id };
}

const taskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']),
});

export async function setTaskStatusAction(input: z.input<typeof taskStatusSchema>): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const parsed = taskStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id, status, assignee_id')
    .eq('id', parsed.data.taskId)
    .single();
  if (!task?.project_id) return { ok: false, error: 'Task not found.' };
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, task.project_id as string);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  if (!canTransition<TaskStatus>(StatusMachines.task, task.status as TaskStatus, parsed.data.status)) {
    return { ok: false, error: `Cannot move from ${task.status} to ${parsed.data.status}.` };
  }
  const { error } = await supabase
    .from('tasks')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspace/${task.project_id}`);
  return { ok: true };
}

// Milestones

export async function createMilestoneAction(
  projectId: string,
  input: z.input<typeof milestoneCreateSchema>,
): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, projectId);
  if (!perms.canCreateMilestones) return { ok: false, error: 'Not allowed.' };
  const parsed = milestoneCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { data, error } = await supabase
    .from('milestones')
    .insert({
      project_id: projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      target_date: parsed.data.targetDate ? parsed.data.targetDate.toISOString() : null,
      status: parsed.data.status,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true, id: data?.id };
}

const milestoneStatusSchema = z.object({
  milestoneId: z.string().uuid(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']),
});

export async function setMilestoneStatusAction(
  input: z.input<typeof milestoneStatusSchema>,
): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const parsed = milestoneStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { data: ms } = await supabase
    .from('milestones')
    .select('project_id, status')
    .eq('id', parsed.data.milestoneId)
    .single();
  if (!ms?.project_id) return { ok: false, error: 'Milestone not found.' };
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, ms.project_id as string);
  if (!perms.canCreateMilestones) return { ok: false, error: 'Not allowed.' };
  if (!canTransition<MilestoneStatus>(StatusMachines.milestone, ms.status as MilestoneStatus, parsed.data.status)) {
    return { ok: false, error: `Cannot move from ${ms.status} to ${parsed.data.status}.` };
  }
  const isComplete = parsed.data.status === 'COMPLETED';
  const { error } = await supabase
    .from('milestones')
    .update({
      status: parsed.data.status,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.milestoneId);
  if (error) return { ok: false, error: error.message };
  // Award XP if newly completed
  if (isComplete && ms.status !== 'COMPLETED') {
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', ms.project_id)
      .eq('status', 'ACTIVE');
    for (const m of members ?? []) {
      await awardXp(supabase as never, {
        userId: m.user_id as string,
        eventType: 'MILESTONE_COMPLETED',
        entityType: 'milestone',
        entityId: parsed.data.milestoneId,
      });
    }
  }
  revalidatePath(`/workspace/${ms.project_id}`);
  return { ok: true };
}

// Updates

export async function postProjectUpdateAction(
  projectId: string,
  input: z.input<typeof projectUpdateCreateSchema>,
): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, projectId);
  if (!perms.canPostUpdates) return { ok: false, error: 'Not allowed.' };
  const parsed = projectUpdateCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { error } = await supabase.from('project_updates').insert({
    project_id: projectId,
    author_id: me.id,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true };
}

export async function generateWeeklySummaryAction(projectId: string): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const supabase = await createServerSupabase();
  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: 'Project not found.' };
  const { data: updates } = await supabase
    .from('project_updates')
    .select('body, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(5);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId);
  const tasksTotal = tasks?.length ?? 0;
  const tasksCompleted = (tasks ?? []).filter((t) => t.status === 'DONE').length;
  const { data: milestones } = await supabase
    .from('milestones')
    .select('title, status')
    .eq('project_id', projectId);
  const text = await aiWeeklySummary({
    projectTitle: project.title as string,
    recentUpdates: ((updates ?? []) as Array<{ body: string; created_at: string }>).map(
      (u) => ({ body: u.body, createdAt: u.created_at }),
    ),
    tasksCompleted,
    tasksTotal,
    milestones: (milestones ?? []) as Array<{ title: string; status: string }>,
  });
  return { ok: true, id: text };
}

// Artifacts

export async function createArtifactAction(
  projectId: string,
  input: z.input<typeof artifactCreateSchema>,
): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, projectId);
  if (!perms.canCreateArtifacts) return { ok: false, error: 'Not allowed.' };
  const parsed = artifactCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { error } = await supabase.from('artifacts').insert({
    project_id: projectId,
    title: parsed.data.title,
    type: parsed.data.type,
    url: parsed.data.url,
    description: parsed.data.description ?? null,
    creator_id: me.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true };
}

// Contributions

export async function recordContributionAction(
  input: z.input<typeof contributionCreateSchema>,
): Promise<WsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const perms = await resolveProjectPermissions(supabase, { userId: me.id }, input.projectId);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  const parsed = contributionCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  // Verified by the project owner (or self if solo for the demo).
  const { data: proj } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', input.projectId)
    .single();
  const verifiedBy = proj?.owner_id && proj.owner_id !== me.id ? (proj.owner_id as string) : null;
  const { error } = await supabase.from('contributions').insert({
    user_id: me.id,
    project_id: input.projectId,
    type: input.type,
    description: input.description,
    evidence_url: input.evidenceUrl ?? null,
    verified_by: verifiedBy,
  });
  if (error) return { ok: false, error: error.message };
  if (verifiedBy) {
    await awardXp(supabase as never, {
      userId: me.id,
      eventType: 'VERIFIED_CONTRIBUTION',
      entityType: 'contribution',
      entityId: input.projectId,
    });
  }
  revalidatePath(`/workspace/${input.projectId}`);
  return { ok: true };
}
