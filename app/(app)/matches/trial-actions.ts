'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded, db } from '@/lib/db/store';
import { canTransition, StatusMachines } from '@/config/transitions';
import { awardXp } from '@/lib/xp/award';
import { applyReputationEvent } from '@/lib/reputation/apply-event';
import { REPUTATION } from '@/config/gamification';
import type { MatchStatus, TrialStatus } from '@/config/constants';
import {
  createTrial, getMatch, getProjectById, updateMatch, addTrialMember, createTask,
  getOrCreateTrialChannel, createTrialReview, updateTask, createMessage, listMessages,
} from '@/lib/db/store/queries';

export interface TrialActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  trialId?: string;
}

const startSchema = z.object({
  matchId: z.string(),
  projectId: z.string(),
  durationDays: z.union([z.literal(7), z.literal(14)]).default(7),
  goal: z.string().min(10).max(800).optional(),
  deliverables: z.array(z.string()).min(1).max(8).optional(),
});

export async function createTrialAction(
  input: z.input<typeof startSchema>,
): Promise<TrialActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;

  const match = getMatch(data.matchId);
  if (!match) return { ok: false, error: 'Match not found.' };
  if (match.status !== 'MUTUAL') return { ok: false, error: 'Match is not mutual yet.' };

  const project = getProjectById(match.project_id);
  if (!project) return { ok: false, error: 'Project not found.' };
  const ownerId = project.owner_id;
  const candidateId = match.candidate_user_id === ownerId ? match.initiator_user_id : match.candidate_user_id;
  if (me.id !== ownerId && me.id !== candidateId) {
    return { ok: false, error: 'Not a participant of this match.' };
  }
  if (me.id !== ownerId) {
    return { ok: false, error: 'Only the project owner can start the trial.' };
  }

  const existing = db.trials.findOne((t) => (t as { match_id: string | null }).match_id === match.id);
  if (existing && (existing.status === 'ACTIVE' || existing.status === 'DRAFT')) {
    return { ok: false, error: 'A trial already exists for this match.', trialId: existing.id };
  }

  const goal = data.goal ?? 'Test working together on a focused 7-day deliverable.';
  const deliverables = data.deliverables ?? [
    'Document a clear, focused outcome',
    'Communicate regularly in the trial room',
    'Submit a peer review at the end',
  ];

  const trial = createTrial({
    project_id: match.project_id,
    role_id: match.role_id,
    match_id: match.id,
    owner_id: ownerId,
    goal,
    deliverables,
    duration_days: data.durationDays,
  });

  addTrialMember(trial.id, ownerId, 'OWNER');
  addTrialMember(trial.id, candidateId, 'COLLABORATOR');

  getOrCreateTrialChannel(trial.id, `Trial: ${goal.slice(0, 60)}`);

  for (const title of [
    'Trial kickoff — meet and align on the goal',
    'First deliverable check-in',
    'Submit peer review',
  ]) {
    createTask({
      project_id: match.project_id,
      trial_id: trial.id,
      title,
      priority: title.includes('peer review') || title.includes('kickoff') ? 'HIGH' : 'MEDIUM',
      created_by: ownerId,
    });
  }

  if (canTransition<MatchStatus>(StatusMachines.match, 'MUTUAL', 'TRIAL_STARTED')) {
    updateMatch(match.id, { status: 'TRIAL_STARTED' } as never);
  }

  revalidatePath('/matches');
  revalidatePath('/trials');
  return { ok: true, id: trial.id, trialId: trial.id };
}

const reviewSchema = z.object({
  trialId: z.string(),
  revieweeId: z.string(),
  wouldWorkAgain: z.enum(['YES', 'MAYBE', 'NO']),
  ratings: z.object({
    communication: z.coerce.number().int().min(1).max(5),
    reliability: z.coerce.number().int().min(1).max(5),
    technical: z.coerce.number().int().min(1).max(5),
    commitment: z.coerce.number().int().min(1).max(5),
    collaboration: z.coerce.number().int().min(1).max(5),
  }),
  comment: z.string().max(1000).optional(),
});

export async function submitTrialReviewAction(
  input: z.input<typeof reviewSchema>,
): Promise<TrialActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;

  const tm = db.trial_members.findOne(
    (m) => (m as { trial_id: string }).trial_id === data.trialId && m.user_id === me.id,
  );
  if (!tm) return { ok: false, error: 'Not a trial participant.' };

  const reviewee = db.trial_members.findOne(
    (m) => (m as { trial_id: string }).trial_id === data.trialId && m.user_id === data.revieweeId,
  );
  if (!reviewee) return { ok: false, error: 'Reviewee is not on this trial.' };

  const existing = db.trial_reviews.findOne(
    (r) => (r as { trial_id: string; reviewer_id: string; reviewee_id: string }).trial_id === data.trialId
      && (r as { reviewer_id: string }).reviewer_id === me.id
      && (r as { reviewee_id: string }).reviewee_id === data.revieweeId,
  );
  if (existing) return { ok: false, error: 'You already reviewed this person for this trial.' };

  createTrialReview({
    trial_id: data.trialId,
    reviewer_id: me.id,
    reviewee_id: data.revieweeId,
    would_work_again: data.wouldWorkAgain,
    communication: data.ratings.communication,
    reliability: data.ratings.reliability,
    technical: data.ratings.technical,
    commitment: data.ratings.commitment,
    collaboration: data.ratings.collaboration,
    comment: data.comment ?? null,
  });

  const avg = (data.ratings.communication + data.ratings.reliability + data.ratings.technical + data.ratings.commitment + data.ratings.collaboration) / 5;
  if (avg >= 4 && data.wouldWorkAgain === 'YES') {
    const weight = Math.min(1, (avg - 3) / 2);
    await applyReputationEvent(null, {
      userId: data.revieweeId,
      source: 'PEER_REVIEW',
      delta: REPUTATION.MAX_DELTA.PEER_REVIEW,
      weight,
      reason: 'Positive trial review',
      sourceId: data.trialId,
      sourceType: 'trial',
    });
  } else if (data.wouldWorkAgain === 'NO' || avg <= 2) {
    const weight = Math.min(1, (3 - avg) / 2);
    await applyReputationEvent(null, {
      userId: data.revieweeId,
      source: 'PEER_REVIEW',
      delta: -REPUTATION.MAX_DELTA.PEER_REVIEW,
      weight,
      reason: 'Negative trial review',
      sourceId: data.trialId,
      sourceType: 'trial',
    });
  }

  revalidatePath(`/trials/${data.trialId}`);
  return { ok: true };
}

const completeSchema = z.object({
  trialId: z.string(),
  decision: z.enum(['SUCCESSFUL', 'ENDED']),
});

export async function completeTrialAction(
  input: z.input<typeof completeSchema>,
): Promise<TrialActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const trial = db.trials.get(parsed.data.trialId);
  if (!trial) return { ok: false, error: 'Trial not found.' };
  if (trial.owner_id !== me.id) return { ok: false, error: 'Only the owner can complete the trial.' };
  if (!canTransition<TrialStatus>(StatusMachines.trial, trial.status as TrialStatus, 'COMPLETED')) {
    return { ok: false, error: `Cannot complete a ${trial.status} trial.` };
  }

  db.trials.update(trial.id, { status: 'COMPLETED' } as never);

  const members = db.trial_members.list({ trial_id: trial.id });
  for (const m of members) {
    await awardXp(null, {
      userId: m.user_id,
      eventType: 'TRIAL_COMPLETED',
      entityType: 'trial',
      entityId: trial.id,
    });
  }

  if (parsed.data.decision === 'SUCCESSFUL') {
    db.trials.update(trial.id, { status: 'SUCCESSFUL' } as never);
    const cand = members.find((m) => m.role === 'COLLABORATOR');
    if (cand) {
      db.project_members.insert({
        project_id: trial.project_id,
        user_id: cand.user_id,
        member_type: 'COLLABORATOR' as never,
        status: 'ACTIVE' as never,
        role_title: null,
        joined_at: new Date().toISOString(),
        left_at: null,
      } as never);
      await awardXp(null, {
        userId: cand.user_id,
        eventType: 'SUCCESSFUL_COLLABORATION',
        entityType: 'trial',
        entityId: trial.id,
      });
      await awardXp(null, {
        userId: trial.owner_id,
        eventType: 'SUCCESSFUL_COLLABORATION',
        entityType: 'trial',
        entityId: trial.id,
      });
      await applyReputationEvent(null, {
        userId: cand.user_id,
        source: 'TRIAL_SUCCESS',
        delta: REPUTATION.MAX_DELTA.TRIAL_SUCCESS,
        weight: 1,
        reason: 'Successful trial',
        sourceId: trial.id,
        sourceType: 'trial',
      });
    }
  } else {
    db.trials.update(trial.id, { status: 'ENDED' } as never);
  }
  revalidatePath(`/trials/${trial.id}`);
  revalidatePath(`/projects/${trial.project_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Trial task + chat actions (used by the trial tabs client component).
// ---------------------------------------------------------------------------

export interface TrialTaskResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const addTaskSchema = z.object({
  trialId: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(200),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional().nullable(),
});

export async function addTrialTaskAction(input: z.input<typeof addTaskSchema>): Promise<TrialTaskResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = addTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const trial = db.trials.get(parsed.data.trialId);
  if (!trial) return { ok: false, error: 'Trial not found.' };
  const member = db.trial_members.findOne(
    (m) => (m as { trial_id: string }).trial_id === parsed.data.trialId && m.user_id === me.id,
  );
  if (!member) return { ok: false, error: 'Not a trial participant.' };
  const task = createTask({
    project_id: parsed.data.projectId,
    trial_id: parsed.data.trialId,
    title: parsed.data.title,
    priority: parsed.data.priority,
    assignee_id: parsed.data.assigneeId ?? undefined,
    created_by: me.id,
  });
  revalidatePath(`/trials/${parsed.data.trialId}`);
  return { ok: true, id: task.id };
}

const setStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']),
});

export async function setTrialTaskStatusAction(input: z.input<typeof setStatusSchema>): Promise<TrialTaskResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const task = db.tasks.get(parsed.data.taskId);
  if (!task || !task.trial_id) return { ok: false, error: 'Task not found.' };
  const member = db.trial_members.findOne(
    (m) => (m as { trial_id: string }).trial_id === task.trial_id && m.user_id === me.id,
  );
  if (!member) return { ok: false, error: 'Not a trial participant.' };
  updateTask(parsed.data.taskId, { status: parsed.data.status } as never);
  revalidatePath(`/trials/${task.trial_id}`);
  return { ok: true };
}

const setAssigneeSchema = z.object({
  taskId: z.string(),
  assigneeId: z.string().nullable(),
});

export async function setTrialTaskAssigneeAction(input: z.input<typeof setAssigneeSchema>): Promise<TrialTaskResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = setAssigneeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const task = db.tasks.get(parsed.data.taskId);
  if (!task || !task.trial_id) return { ok: false, error: 'Task not found.' };
  const member = db.trial_members.findOne(
    (m) => (m as { trial_id: string }).trial_id === task.trial_id && m.user_id === me.id,
  );
  if (!member) return { ok: false, error: 'Not a trial participant.' };
  updateTask(parsed.data.taskId, { assignee_id: parsed.data.assigneeId } as never);
  revalidatePath(`/trials/${task.trial_id}`);
  return { ok: true };
}

const sendMessageSchema = z.object({
  channelId: z.string(),
  content: z.string().min(1).max(2000),
});

export async function sendTrialMessageAction(input: z.input<typeof sendMessageSchema>): Promise<TrialTaskResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const channel = db.channels.get(parsed.data.channelId);
  if (!channel || !channel.trial_id) return { ok: false, error: 'Channel not found.' };
  const member = db.trial_members.findOne(
    (m) => (m as { trial_id: string }).trial_id === channel.trial_id && m.user_id === me.id,
  );
  if (!member) return { ok: false, error: 'Not a trial participant.' };
  const message = createMessage({
    channel_id: parsed.data.channelId,
    sender_id: me.id,
    content: parsed.data.content,
  });
  revalidatePath(`/trials/${channel.trial_id}`);
  return { ok: true, id: message.id };
}

export async function listTrialMessagesAction(trialId: string, limit = 200) {
  await ensureSeeded();
  const channel = db.channels.findOne((c) => (c as { trial_id: string | null }).trial_id === trialId);
  if (!channel) return [];
  return listMessages(channel.id, limit);
}
