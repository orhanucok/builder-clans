'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { ensureSeeded, db } from '@/lib/db/store';
import {
  getProjectById, createApplication, listApplicationsForProject, createMatch, getMatch, updateMatch,
} from '@/lib/db/store/queries';
import { z } from 'zod';
import { projectRoleCreateSchema } from '@/lib/validation/schemas';
import { canTransition, StatusMachines } from '@/config/transitions';
import type { ApplicationStatus, MatchStatus } from '@/config/constants';
import { createProjectRole } from '@/lib/db/store/queries';

export interface ServerActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const applySchema = z.object({
  projectId: z.string(),
  roleId: z.string().optional(),
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
  await ensureSeeded();
  const me = await requireUser();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;

  // Sanity: cannot apply to own project
  const project = getProjectById(data.projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.owner_id === me.id) return { ok: false, error: 'You cannot apply to your own project.' };
  if (project.status !== 'ACTIVE') return { ok: false, error: 'Project is not accepting applications.' };

  // Check for an existing application
  const existing = listApplicationsForProject(data.projectId).find(
    (a) => a.applicant_id === me.id,
  );
  if (existing && existing.status === 'PENDING') {
    return { ok: false, error: 'You already have a pending application.' };
  }

  createApplication({
    project_id: data.projectId,
    role_id: data.roleId ?? null,
    applicant_id: me.id,
    why_interested: data.whyInterested,
    contribution: data.contribution,
    hours_per_week: data.hoursPerWeek,
    note: data.note,
  });

  // Create a match row in APPLIED
  createMatch({
    project_id: data.projectId,
    role_id: data.roleId ?? null,
    initiator_user_id: me.id,
    candidate_user_id: me.id,
    status: 'APPLIED',
  });

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath('/matches');
  return { ok: true };
}

const inviteSchema = z.object({
  projectId: z.string(),
  roleId: z.string().optional(),
  candidateUserId: z.string(),
});

/**
 * Project owner invites a candidate. Creates a match in INVITED status.
 */
export async function inviteCandidateAction(
  input: z.input<typeof inviteSchema>,
): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;

  const project = getProjectById(data.projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.owner_id !== me.id) return { ok: false, error: 'Only the project owner can invite.' };

  // Upsert match row in INVITED status
  const existing = (db.matches.all() as any).find(
    (m) => m.project_id === data.projectId && m.candidate_user_id === data.candidateUserId,
  );
  if (existing) {
    if (!canTransition<MatchStatus>(StatusMachines.match, existing.status as MatchStatus, 'INVITED')) {
      return { ok: false, error: `Match is in ${existing.status}, cannot invite.` };
    }
    updateMatch(existing.id, { status: 'INVITED', role_id: data.roleId ?? null } as never);
  } else {
    createMatch({
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
  await ensureSeeded();
  const me = await requireUser();
  const match = getMatch(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };

  const newStatus: MatchStatus = 'MUTUAL';
  if (!canTransition<MatchStatus>(StatusMachines.match, match.status as MatchStatus, newStatus)) {
    return { ok: false, error: `Cannot accept a ${match.status} match.` };
  }
  if (me.id !== match.candidate_user_id) {
    return { ok: false, error: 'Not allowed.' };
  }
  updateMatch(matchId, { status: newStatus } as never);
  revalidatePath('/matches');
  revalidatePath(`/projects/${match.project_id}`);
  return { ok: true };
}

export async function declineMatchAction(matchId: string): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const match = getMatch(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };

  let allowed = me.id === match.candidate_user_id;
  if (!allowed) {
    const proj = getProjectById(match.project_id);
    if (proj?.owner_id === me.id) allowed = true;
  }
  if (!allowed) return { ok: false, error: 'Not allowed.' };

  if (!canTransition<MatchStatus>(StatusMachines.match, match.status as MatchStatus, 'DECLINED')) {
    return { ok: false, error: `Cannot decline a ${match.status} match.` };
  }
  updateMatch(matchId, { status: 'DECLINED' } as never);
  revalidatePath('/matches');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Application decisions (owner only)
// ---------------------------------------------------------------------------

const decideSchema = z.object({
  applicationId: z.string(),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
});

export async function decideApplicationAction(
  input: z.input<typeof decideSchema>,
): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const app = db.applications.get(input.applicationId);
  if (!app) return { ok: false, error: 'Application not found.' };
  if (!canTransition<ApplicationStatus>(StatusMachines.application, app.status as ApplicationStatus, parsed.data.decision)) {
    return { ok: false, error: `Cannot ${parsed.data.decision.toLowerCase()} a ${app.status} application.` };
  }
  const proj = getProjectById(app.project_id);
  if (proj?.owner_id !== me.id) return { ok: false, error: 'Only the owner can decide.' };

  db.applications.update(input.applicationId, {
    status: parsed.data.decision,
    decided_at: new Date().toISOString(),
  } as never);
  revalidatePath(`/projects/${app.project_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Open role creation (owner only)
// ---------------------------------------------------------------------------

const createRoleSchema = projectRoleCreateSchema.extend({
  projectId: z.string(),
});

export async function createProjectRoleAction(
  input: z.input<typeof createRoleSchema>,
): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = await requireUser();
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const proj = getProjectById(parsed.data.projectId);
  if (proj?.owner_id !== me.id) return { ok: false, error: 'Only the owner can create roles.' };
  const role = createProjectRole({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description ?? undefined,
    commitment_min: parsed.data.commitmentMin,
    commitment_max: parsed.data.commitmentMax,
    experience_level: parsed.data.experienceLevel as string,
    required_skills: parsed.data.requiredSkills,
  });
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, id: role.id };
}
