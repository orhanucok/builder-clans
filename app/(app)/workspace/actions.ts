'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded, db } from '@/lib/db/store';
import {
  getProjectById, listTasksForProject, listMilestones, listProjectUpdates,
  createTask, updateTask, getTask, createMilestone, updateMilestone, getTask as _,
  createProjectUpdate, createArtifact, getProjectById as __,
  listProjectMembers,
} from '@/lib/db/store/queries';
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
  await ensureSeeded();
  const me = await requireUser();
  const proj = getProjectById(projectId);
  if (!proj) return { ok: false, error: 'Project not found.' };
  const perms = resolveProjectPermissions(db, { userId: me.id }, projectId);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  const parsed = taskCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const task = createTask({
    project_id: projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    assignee_id: parsed.data.assigneeId,
    due_date: parsed.data.dueDate ? parsed.data.dueDate.toISOString() : undefined,
    created_by: me.id,
  });
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true, id: task.id };
}

const taskStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']),
});

export async function setTaskStatusAction(input: z.input<typeof taskStatusSchema>): Promise<WsResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = taskStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const task = getTask(parsed.data.taskId);
  if (!task?.project_id) return { ok: false, error: 'Task not found.' };
  const perms = resolveProjectPermissions(db, { userId: me.id }, task.project_id);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  if (!canTransition<TaskStatus>(StatusMachines.task, task.status as TaskStatus, parsed.data.status)) {
    return { ok: false, error: `Cannot move from ${task.status} to ${parsed.data.status}.` };
  }
  updateTask(parsed.data.taskId, { status: parsed.data.status } as never);
  revalidatePath(`/workspace/${task.project_id}`);
  return { ok: true };
}

// Milestones

export async function createMilestoneAction(
  projectId: string,
  input: z.input<typeof milestoneCreateSchema>,
): Promise<WsResult> {
  await ensureSeeded();
  const me = await requireUser();
  const perms = resolveProjectPermissions(db, { userId: me.id }, projectId);
  if (!perms.canCreateMilestones) return { ok: false, error: 'Not allowed.' };
  const parsed = milestoneCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const ms = createMilestone({
    project_id: projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    target_date: parsed.data.targetDate ? parsed.data.targetDate.toISOString() : undefined,
  });
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true, id: ms.id };
}

const milestoneStatusSchema = z.object({
  milestoneId: z.string(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']),
});

export async function setMilestoneStatusAction(
  input: z.input<typeof milestoneStatusSchema>,
): Promise<WsResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = milestoneStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const ms = db.milestones.get(parsed.data.milestoneId);
  if (!ms?.project_id) return { ok: false, error: 'Milestone not found.' };
  const perms = resolveProjectPermissions(db, { userId: me.id }, ms.project_id);
  if (!perms.canCreateMilestones) return { ok: false, error: 'Not allowed.' };
  if (!canTransition<MilestoneStatus>(StatusMachines.milestone, ms.status as MilestoneStatus, parsed.data.status)) {
    return { ok: false, error: `Cannot move from ${ms.status} to ${parsed.data.status}.` };
  }
  const isComplete = parsed.data.status === 'COMPLETED';
  updateMilestone(parsed.data.milestoneId, {
    status: parsed.data.status,
    completed_at: isComplete ? new Date().toISOString() : null,
  } as never);
  if (isComplete && ms.status !== 'COMPLETED') {
    const members = listProjectMembers(ms.project_id).filter((m) => m.status === 'ACTIVE');
    for (const m of members) {
      await awardXp(null, {
        userId: m.user_id,
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
  await ensureSeeded();
  const me = await requireUser();
  const perms = resolveProjectPermissions(db, { userId: me.id }, projectId);
  if (!perms.canPostUpdates) return { ok: false, error: 'Not allowed.' };
  const parsed = projectUpdateCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  createProjectUpdate({
    project_id: projectId,
    author_id: me.id,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  });
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true };
}

export async function generateWeeklySummaryAction(projectId: string): Promise<WsResult> {
  await ensureSeeded();
  const project = getProjectById(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const updates = listProjectUpdates(projectId).slice(0, 5);
  const tasks = listTasksForProject(projectId);
  const milestones = listMilestones(projectId);
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === 'DONE').length;
  const text = await aiWeeklySummary({
    projectTitle: project.title,
    recentUpdates: updates.map((u) => ({ body: u.body, createdAt: u.created_at })),
    tasksCompleted,
    tasksTotal,
    milestones: milestones.map((m) => ({ title: m.title, status: m.status })),
  });
  return { ok: true, id: text };
}

// Artifacts

export async function createArtifactAction(
  projectId: string,
  input: z.input<typeof artifactCreateSchema>,
): Promise<WsResult> {
  await ensureSeeded();
  const me = await requireUser();
  const perms = resolveProjectPermissions(db, { userId: me.id }, projectId);
  if (!perms.canCreateArtifacts) return { ok: false, error: 'Not allowed.' };
  const parsed = artifactCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  createArtifact({
    project_id: projectId,
    title: parsed.data.title,
    type: parsed.data.type,
    url: parsed.data.url,
    description: parsed.data.description,
    creator_id: me.id,
  });
  revalidatePath(`/workspace/${projectId}`);
  return { ok: true };
}

// Contributions

export async function recordContributionAction(
  input: z.input<typeof contributionCreateSchema>,
): Promise<WsResult> {
  await ensureSeeded();
  const me = await requireUser();
  const perms = resolveProjectPermissions(db, { userId: me.id }, input.projectId);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  const parsed = contributionCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const proj = getProjectById(input.projectId);
  const verifiedBy = proj?.owner_id && proj.owner_id !== me.id ? proj.owner_id : null;
  createContribution({
    user_id: me.id,
    project_id: input.projectId,
    type: input.type,
    description: input.description,
    evidence_url: input.evidenceUrl,
    verified_by: verifiedBy ?? undefined,
  });
  if (verifiedBy) {
    await awardXp(null, {
      userId: me.id,
      eventType: 'VERIFIED_CONTRIBUTION',
      entityType: 'contribution',
      entityId: input.projectId,
    });
  }
  revalidatePath(`/workspace/${input.projectId}`);
  return { ok: true };
}

import {
  createContribution, createMessage, listMessages, getOrCreateProjectChannel,
} from '@/lib/db/store/queries';
import { emitMessage } from '@/lib/db/store/messaging';

// Chat (project channel)

const sendChatSchema = z.object({
  projectId: z.string(),
  content: z.string().min(1).max(2000),
});

export async function sendChatMessageAction(input: z.input<typeof sendChatSchema>): Promise<WsResult> {
  await ensureSeeded();
  const me = await requireUser();
  const perms = resolveProjectPermissions(db, { userId: me.id }, input.projectId);
  if (!perms.canView) return { ok: false, error: 'Not allowed.' };
  const parsed = sendChatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const channel = getOrCreateProjectChannel(parsed.data.projectId, 'general');
  const msg = createMessage({ channel_id: channel.id, sender_id: me.id, content: parsed.data.content });
  emitMessage(msg);
  revalidatePath(`/workspace/${parsed.data.projectId}`);
  return { ok: true, id: msg.id };
}

export async function listChatMessagesAction(projectId: string, limit = 200) {
  await ensureSeeded();
  const me = await requireUser();
  const perms = resolveProjectPermissions(db, { userId: me.id }, projectId);
  if (!perms.canView) return [];
  const channel = db.channels.findOne((c) => (c as { project_id: string | null }).project_id === projectId);
  if (!channel) return [];
  return listMessages(channel.id, limit);
}
