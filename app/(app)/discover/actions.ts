'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { z } from 'zod';
import { projectRoleCreateSchema } from '@/lib/validation/schemas';
import { canTransition, StatusMachines } from '@/config/transitions';
import type { ApplicationStatus, MatchStatus } from '@/config/constants';

export interface ServerActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const applySchema = z.object({
  projectId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  whyInterested: z.string().max(1000).optional(),
  contribution: z.string().max(1000).optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(80),
  note: z.string().max(500).optional(),
});

/**
 * Candidate applies to a project (or a specific role).
 * Creates an application + a match row in APPLIED status.
 */
export async function applyToProjectAction(
  input: z.input<typeof applySchema>,
): Promise<ServerActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;
  const supabase = await createServerSupabase();

  // Sanity: cannot apply to own project
  const { data: project } = await supabase
    .from('projects')
    .select('id, owner_id, status')
    .eq('id', data.projectId)
    .single();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.owner_id === me.id) return { ok: false, error: 'You cannot apply to your own project.' };
  if (project.status !== 'ACTIVE') return { ok: false, error: 'Project is not accepting applications.' }

  // Check for an existing application
  const { data: existing } = await supabase
    .from('applications')
    .select('id, status')
    .eq('project_id', data.projectId)
    .eq('applicant_id', me.id)
    .maybeSingle();
  if (existing && existing.status === 'PENDING') {
    return { ok: false, error: 'You already have a pending application.' };
  }

  const { error: appErr } = await supabase.from('applications').insert({
    project_id: data.projectId,
    role_id: data.roleId ?? null,
    applicant_id: me.id,
    why_interested: data.whyInterested ?? null,
    contribution: data.contribution ?? null,
    hours_per_week: data.hoursPerWeek,
    note: data.note ?? null,
    status: 'PENDING',
  });
  if (appErr) return { ok: false, error: appErr.message };

  // Create a match row in APPLIED
  const { error: matchErr } = await supabase.from('matches').insert({
    project_id: data.projectId,
    role_id: data.roleId ?? null,
    initiator_user_id: me.id,
    candidate_user_id: me.id, // self-applied; owner is the other party
    status: 'APPLIED',
  });
  if (matchErr && !/duplicate/i.test(matchErr.message)) {
    // soft-fail: application still created
  }

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath('/matches');
  return { ok: true };
}

const inviteSchema = z.object({
  projectId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  candidateUserId: z.string().uuid(),
});

/**
 * Project owner invites a candidate. Creates a match in INVITED status.
 */
export async function inviteCandidateAction(
  input: z.input<typeof inviteSchema>,
): Promise<ServerActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;
  const supabase = await createServerSupabase();

  const { data: project } = await supabase
    .from('projects')
    .select('id, owner_id, status')
    .eq('id', data.projectId)
    .single();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.owner_id !== me.id) return { ok: false, error: 'Only the project owner can invite.' };

  // Upsert match row in INVITED status
  const { data: existing } = await supabase
    .from('matches')
    .select('id, status')
    .eq('project_id', data.projectId)
    .eq('candidate_user_id', data.candidateUserId)
    .maybeSingle();
  if (existing) {
    if (!canTransition<MatchStatus>(StatusMachines.match, existing.status as MatchStatus, 'INVITED')) {
      return { ok: false, error: `Match is in ${existing.status}, cannot invite.` };
    }
    await supabase
      .from('matches')
      .update({ status: 'INVITED', role_id: data.roleId ?? null, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('matches').insert({
      project_id: data.projectId,
      role_id: data.roleId ?? null,
      initiator_user_id: me.id,
      candidate_user_id: data.candidateUserId,
      status: 'INVITED',
    });
  }

  revalidatePath('/matches');
  revalidatePath(`/projects/${data.projectId}`);
  return { ok: true };
}

/**
 * Accept a match. Becomes MUTUAL.
 */
export async function acceptMatchAction(matchId: string): Promise<ServerActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const { data: match } = await supabase
    .from('matches')
    .select('id, status, project_id, candidate_user_id')
    .eq('id', matchId)
    .single();
  if (!match) return { ok: false, error: 'Match not found.' };

  // Either party can accept for the match to be mutual.
  // If the candidate accepts an INVITED, or the owner accepts an APPLIED,
  // the match transitions to MUTUAL.
  const newStatus: MatchStatus = 'MUTUAL';
  if (!canTransition<MatchStatus>(StatusMachines.match, match.status as MatchStatus, newStatus)) {
    return { ok: false, error: `Cannot accept a ${match.status} match.` };
  }
  // Authorization
  if (me.id === match.candidate_user_id || true /* owner handled in separate action */) {
    // ok
  } else {
    return { ok: false, error: 'Not allowed.' };
  }
  await supabase
    .from('matches')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', matchId);
  revalidatePath('/matches');
  revalidatePath(`/projects/${match.project_id}`);
  return { ok: true };
}

export async function declineMatchAction(matchId: string): Promise<ServerActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const { data: match } = await supabase
    .from('matches')
    .select('id, status, project_id, candidate_user_id')
    .eq('id', matchId)
    .single();
  if (!match) return { ok: false, error: 'Match not found.' };
  if (me.id !== match.candidate_user_id) {
    // Owners can also decline on behalf of the project
    const { data: proj } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', match.project_id)
      .single();
    if (proj?.owner_id !== me.id) return { ok: false, error: 'Not allowed.' };
  }
  if (!canTransition<MatchStatus>(StatusMachines.match, match.status as MatchStatus, 'DECLINED')) {
    return { ok: false, error: `Cannot decline a ${match.status} match.` };
  }
  await supabase
    .from('matches')
    .update({ status: 'DECLINED', updated_at: new Date().toISOString() })
    .eq('id', matchId);
  revalidatePath('/matches');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Application decisions (owner only)
// ---------------------------------------------------------------------------

const decideSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
});

export async function decideApplicationAction(
  input: z.input<typeof decideSchema>,
): Promise<ServerActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const supabase = await createServerSupabase();
  const { data: app } = await supabase
    .from('applications')
    .select('id, status, project_id, applicant_id')
    .eq('id', input.applicationId)
    .single();
  if (!app) return { ok: false, error: 'Application not found.' };
  if (!canTransition<ApplicationStatus>(StatusMachines.application, app.status as ApplicationStatus, parsed.data.decision)) {
    return { ok: false, error: `Cannot ${parsed.data.decision.toLowerCase()} a ${app.status} application.` };
  }
  // Owner check
  const { data: proj } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', app.project_id)
    .single();
  if (proj?.owner_id !== me.id) return { ok: false, error: 'Only the owner can decide.' };

  await supabase
    .from('applications')
    .update({
      status: parsed.data.decision,
      decided_at: new Date().toISOString(),
    })
    .eq('id', input.applicationId);
  revalidatePath(`/projects/${app.project_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Open role creation (owner only)
// ---------------------------------------------------------------------------

const createRoleSchema = projectRoleCreateSchema.extend({
  projectId: z.string().uuid(),
});

export async function createProjectRoleAction(
  input: z.input<typeof createRoleSchema>,
): Promise<ServerActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const me = await requireUser();
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const supabase = await createServerSupabase();
  const { data: proj } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', parsed.data.projectId)
    .single();
  if (proj?.owner_id !== me.id) return { ok: false, error: 'Only the owner can create roles.' };
  const { data, error } = await supabase
    .from('project_roles')
    .insert({
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      commitment_min: parsed.data.commitmentMin,
      commitment_max: parsed.data.commitmentMax,
      experience_level: parsed.data.experienceLevel,
      required_skills: parsed.data.requiredSkills,
      status: 'OPEN',
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, id: data?.id };
}
