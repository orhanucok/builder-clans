/**
 * Discover / match actions — plain functions usable from client components.
 */

import { ensureSeeded } from '@/lib/db/store/seed';
import { getMemoryDb } from '@/lib/db/store/memory';
import {
  getProjectById,
  createApplication,
  listApplicationsForProject,
  createMatch,
  getMatch,
  updateMatch,
  createProjectRole,
} from '@/lib/db/store/queries';
import { z } from 'zod';
import { projectRoleCreateSchema } from '@/lib/validation/schemas';
import { canTransition, StatusMachines } from '@/config/transitions';
import type { ApplicationStatus, MatchStatus } from '@/config/constants';
import { getCurrentClientUser } from '@/lib/auth/demo';

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

export async function applyToProjectAction(input: z.input<typeof applySchema>): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;

  const project = getProjectById(data.projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.owner_id === me.id) return { ok: false, error: 'You cannot apply to your own project.' };
  if (project.status !== 'ACTIVE') return { ok: false, error: 'Project is not accepting applications.' };

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

  createMatch({
    project_id: data.projectId,
    role_id: data.roleId ?? null,
    initiator_user_id: me.id,
    candidate_user_id: me.id,
    status: 'APPLIED',
  });

  return { ok: true };
}

const inviteSchema = z.object({
  projectId: z.string(),
  roleId: z.string().optional(),
  candidateUserId: z.string(),
});

export async function inviteCandidateAction(input: z.input<typeof inviteSchema>): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const data = parsed.data;

  const project = getProjectById(data.projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.owner_id !== me.id) return { ok: false, error: 'Only the project owner can invite.' };

  const db = getMemoryDb();
  const existing = (db.matches.all() as Array<{ id: string; project_id: string; candidate_user_id: string; status: string }>).find(
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

  return { ok: true };
}

export async function acceptMatchAction(matchId: string): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
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
  return { ok: true };
}

export async function declineMatchAction(matchId: string): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
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
  return { ok: true };
}

const decideSchema = z.object({
  applicationId: z.string(),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
});

export async function decideApplicationAction(input: z.input<typeof decideSchema>): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const db = getMemoryDb();
  const app = db.applications.get(parsed.data.applicationId) as { id: string; status: string; project_id: string } | null;
  if (!app) return { ok: false, error: 'Application not found.' };
  if (
    !canTransition<ApplicationStatus>(
      StatusMachines.application,
      app.status as ApplicationStatus,
      parsed.data.decision,
    )
  ) {
    return { ok: false, error: `Cannot ${parsed.data.decision.toLowerCase()} a ${app.status} application.` };
  }
  const proj = getProjectById(app.project_id);
  if (proj?.owner_id !== me.id) return { ok: false, error: 'Only the owner can decide.' };

  db.applications.update(parsed.data.applicationId, {
    status: parsed.data.decision,
    decided_at: new Date().toISOString(),
  } as never);
  return { ok: true };
}

const createRoleSchema = projectRoleCreateSchema.extend({
  projectId: z.string(),
});

export async function createProjectRoleAction(input: z.input<typeof createRoleSchema>): Promise<ServerActionResult> {
  await ensureSeeded();
  const me = getCurrentClientUser();
  if (!me) return { ok: false, error: 'Not signed in.' };
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
  return { ok: true, id: role.id };
}
