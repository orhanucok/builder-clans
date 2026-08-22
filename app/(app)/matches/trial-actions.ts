'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { canTransition, StatusMachines } from '@/config/transitions';
import { awardXp } from '@/lib/xp/award';
import { applyReputationEvent } from '@/lib/reputation/apply-event';
import { REPUTATION } from '@/config/gamification';
import type { MatchStatus, TrialStatus } from '@/config/constants';

export interface TrialActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  trialId?: string;
}

const startSchema = z.object({
  matchId: z.string().uuid(),
  projectId: z.string().uuid(),
  durationDays: z.union([z.literal(7), z.literal(14)]).default(7),
  goal: z.string().min(10).max(800).optional(),
  deliverables: z.array(z.string()).min(1).max(8).optional(),
});

/**
 * Owner (or matched candidate) starts a Trial Sprint from a MUTUAL match.
 * Creates a trial, two trial_members, and a default task list.
 */
export async function createTrialAction(
  input: z.input<typeof startSchema>,
): Promise<TrialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured.' };
  const me = await requireUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const supabase = await createServerSupabase();

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, project_id, candidate_user_id, initiator_user_id, role_id')
    .eq('id', parsed.data.matchId)
    .single();
  if (!match) return { ok: false, error: 'Match not found.' };
  if (match.status !== 'MUTUAL') return { ok: false, error: 'Match is not mutual yet.' };

  // Identify the two participants: project owner + candidate
  const { data: project } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', match.project_id)
    .single();
  if (!project) return { ok: false, error: 'Project not found.' };
  const ownerId = project.owner_id as string;
  const candidateId = (match.candidate_user_id === ownerId
    ? match.initiator_user_id
    : match.candidate_user_id) as string;
  if (me.id !== ownerId && me.id !== candidateId) {
    return { ok: false, error: 'Not a participant of this match.' };
  }

  // Only the project owner can drive trial creation in v1.
  if (me.id !== ownerId) {
    return { ok: false, error: 'Only the project owner can start the trial.' };
  }

  // Ensure no active trial exists for this match
  const { data: existing } = await supabase
    .from('trials')
    .select('id, status')
    .eq('match_id', match.id)
    .maybeSingle();
  if (existing) {
    if (existing.status === 'ACTIVE' || existing.status === 'DRAFT') {
      return { ok: false, error: 'A trial already exists for this match.', trialId: existing.id };
    }
  }

  const start = new Date();
  const end = new Date(start.getTime() + parsed.data.durationDays * 24 * 60 * 60 * 1000);

  const { data: trial, error: tErr } = await supabase
    .from('trials')
    .insert({
      project_id: match.project_id,
      role_id: match.role_id ?? null,
      match_id: match.id,
      owner_id: ownerId,
      status: 'ACTIVE' as TrialStatus,
      goal: parsed.data.goal ?? 'Test working together on a focused 7-day deliverable.',
      deliverables: parsed.data.deliverables ?? [
        'Document a clear, focused outcome',
        'Communicate regularly in the trial room',
        'Submit a peer review at the end',
      ],
      duration_days: parsed.data.durationDays,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select('id')
    .single();
  if (tErr || !trial) return { ok: false, error: tErr?.message ?? 'Could not create trial.' };

  // Members
  await supabase.from('trial_members').insert([
    { trial_id: trial.id, user_id: ownerId, role: 'OWNER', status: 'ACTIVE' },
    { trial_id: trial.id, user_id: candidateId, role: 'COLLABORATOR', status: 'ACTIVE' },
  ]);

  // Channel
  await supabase
    .from('channels')
    .insert({
      type: 'TRIAL',
      trial_id: trial.id,
      project_id: match.project_id,
      clan_id: null,
      name: `Trial: ${parsed.data.goal?.slice(0, 60) ?? 'Sprint'}`,
    });

  // Default kanban columns
  await supabase.from('tasks').insert([
    {
      trial_id: trial.id,
      project_id: match.project_id,
      title: 'Trial kickoff — meet and align on the goal',
      status: 'TODO',
      priority: 'HIGH',
      created_by: ownerId,
    },
    {
      trial_id: trial.id,
      project_id: match.project_id,
      title: 'First deliverable check-in',
      status: 'TODO',
      priority: 'MEDIUM',
      created_by: ownerId,
    },
    {
      trial_id: trial.id,
      project_id: match.project_id,
      title: 'Submit peer review',
      status: 'TODO',
      priority: 'HIGH',
      created_by: ownerId,
    },
  ]);

  // Move match to TRIAL_STARTED
  if (canTransition<MatchStatus>(StatusMachines.match, 'MUTUAL', 'TRIAL_STARTED')) {
    await supabase
      .from('matches')
      .update({ status: 'TRIAL_STARTED', updated_at: new Date().toISOString() })
      .eq('id', match.id);
  }

  revalidatePath('/matches');
  revalidatePath('/trials');
  return { ok: true, id: trial.id, trialId: trial.id };
}

const reviewSchema = z.object({
  trialId: z.string().uuid(),
  revieweeId: z.string().uuid(),
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

/**
 * Submit a private review of another trial participant.
 * Master plan §24: ratings 1–5, would_work_again, optional comment.
 */
export async function submitTrialReviewAction(
  input: z.input<typeof reviewSchema>,
): Promise<TrialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const supabase = await createServerSupabase();
  const data = parsed.data;

  // Verify membership
  const { data: tm } = await supabase
    .from('trial_members')
    .select('user_id, role')
    .eq('trial_id', data.trialId)
    .eq('user_id', me.id)
    .maybeSingle();
  if (!tm) return { ok: false, error: 'Not a trial participant.' };

  const { data: reviewee } = await supabase
    .from('trial_members')
    .select('user_id')
    .eq('trial_id', data.trialId)
    .eq('user_id', data.revieweeId)
    .maybeSingle();
  if (!reviewee) return { ok: false, error: 'Reviewee is not on this trial.' };

  // Idempotent per (trial, reviewer, reviewee)
  const { data: existing } = await supabase
    .from('trial_reviews')
    .select('id')
    .eq('trial_id', data.trialId)
    .eq('reviewer_id', me.id)
    .eq('reviewee_id', data.revieweeId)
    .maybeSingle();
  if (existing) return { ok: false, error: 'You already reviewed this person for this trial.' };

  const { error } = await supabase.from('trial_reviews').insert({
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
  if (error) return { ok: false, error: error.message };

  // Reputation: positive review → small boost (weighted by average rating)
  const avg =
    (data.ratings.communication +
      data.ratings.reliability +
      data.ratings.technical +
      data.ratings.commitment +
      data.ratings.collaboration) /
    5;
  if (avg >= 4 && data.wouldWorkAgain === 'YES') {
    const weight = Math.min(1, (avg - 3) / 2);
    await applyReputationEvent(supabase as never, {
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
    await applyReputationEvent(supabase as never, {
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

/**
 * Complete the trial (owner only) and decide whether to convert the
 * candidate into a project member.
 */
const completeSchema = z.object({
  trialId: z.string().uuid(),
  decision: z.enum(['SUCCESSFUL', 'ENDED']),
});

export async function completeTrialAction(
  input: z.input<typeof completeSchema>,
): Promise<TrialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const supabase = await createServerSupabase();
  const { data: trial } = await supabase
    .from('trials')
    .select('id, status, owner_id, project_id, role_id, match_id')
    .eq('id', parsed.data.trialId)
    .single();
  if (!trial) return { ok: false, error: 'Trial not found.' };
  if (trial.owner_id !== me.id) return { ok: false, error: 'Only the owner can complete the trial.' };
  if (!canTransition<TrialStatus>(StatusMachines.trial, trial.status as TrialStatus, 'COMPLETED')) {
    return { ok: false, error: `Cannot complete a ${trial.status} trial.` };
  }

  await supabase
    .from('trials')
    .update({ status: 'COMPLETED' })
    .eq('id', trial.id);

  // XP for completing the trial
  const { data: members } = await supabase
    .from('trial_members')
    .select('user_id')
    .eq('trial_id', trial.id);
  for (const m of members ?? []) {
    await awardXp(supabase as never, {
      userId: m.user_id as string,
      eventType: 'TRIAL_COMPLETED',
      entityType: 'trial',
      entityId: trial.id,
    });
  }

  if (parsed.data.decision === 'SUCCESSFUL') {
    if (!canTransition<TrialStatus>(StatusMachines.trial, 'COMPLETED', 'SUCCESSFUL')) {
      return { ok: false, error: 'Cannot mark successful.' };
    }
    await supabase.from('trials').update({ status: 'SUCCESSFUL' }).eq('id', trial.id);

    // Convert the candidate to a project member
    const { data: cand } = await supabase
      .from('trial_members')
      .select('user_id')
      .eq('trial_id', trial.id)
      .eq('role', 'COLLABORATOR')
      .single();
    if (cand) {
      await supabase.from('project_members').upsert(
        {
          project_id: trial.project_id,
          user_id: cand.user_id,
          member_type: 'COLLABORATOR',
          status: 'ACTIVE',
        },
        { onConflict: 'project_id,user_id' },
      );
      // XP for successful collaboration
      await awardXp(supabase as never, {
        userId: cand.user_id as string,
        eventType: 'SUCCESSFUL_COLLABORATION',
        entityType: 'trial',
        entityId: trial.id,
      });
      await awardXp(supabase as never, {
        userId: trial.owner_id as string,
        eventType: 'SUCCESSFUL_COLLABORATION',
        entityType: 'trial',
        entityId: trial.id,
      });
      // Reputation boost for both
      await applyReputationEvent(supabase as never, {
        userId: cand.user_id as string,
        source: 'TRIAL_SUCCESS',
        delta: REPUTATION.MAX_DELTA.TRIAL_SUCCESS,
        weight: 1,
        reason: 'Successful trial',
        sourceId: trial.id,
        sourceType: 'trial',
      });
    }
  } else {
    await supabase.from('trials').update({ status: 'ENDED' }).eq('id', trial.id);
  }
  revalidatePath(`/trials/${trial.id}`);
  revalidatePath(`/projects/${trial.project_id}`);
  return { ok: true };
}
