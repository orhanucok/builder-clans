/**
 * Builder Clans — Centralized permission helpers.
 *
 * Master plan §84: "Permission helpers merkezi olsun. UI kontrolüne güvenme.
 * Backend'de enforce et."
 *
 * All server actions and route handlers MUST call one of these before
 * mutating. The RLS policies in supabase/migrations are the second line
 * of defense; these helpers are the first.
 *
 * Reads from the active data store (Supabase when configured, in-memory
 * otherwise). The first argument is intentionally typed loosely so callers
 * can pass either a Supabase client or the in-memory Database.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database as SqlDatabase } from '@/types/database';
import { db as inMemoryDb, ensureSeeded } from '@/lib/db/store';

type DB = SupabaseClient<SqlDatabase>;

export interface PermissionContext {
  userId: string;
}

export interface ProjectPermissions {
  canView: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canDelete: boolean;
  canCreateArtifacts: boolean;
  canCreateMilestones: boolean;
  canPostUpdates: boolean;
  memberType: 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR' | null;
}

const EMPTY: ProjectPermissions = {
  canView: false,
  canEdit: false,
  canManageMembers: false,
  canManageRoles: false,
  canDelete: false,
  canCreateArtifacts: false,
  canCreateMilestones: false,
  canPostUpdates: false,
  memberType: null,
};

/**
 * Resolve a user's permissions on a project.
 */
export async function resolveProjectPermissions(
  _supabase: DB | null,
  ctx: PermissionContext,
  projectId: string,
): Promise<ProjectPermissions> {
  await ensureSeeded();
  const project = inMemoryDb.projects.get(projectId);
  if (!project) return EMPTY;

  const isOwner = project.owner_id === ctx.userId;
  if (isOwner) {
    return {
      canView: true,
      canEdit: true,
      canManageMembers: true,
      canManageRoles: true,
      canDelete: true,
      canCreateArtifacts: true,
      canCreateMilestones: true,
      canPostUpdates: true,
      memberType: 'OWNER',
    };
  }

  const member = inMemoryDb.project_members.findOne(
    (m) => m.project_id === projectId && m.user_id === ctx.userId && m.status === 'ACTIVE',
  );

  if (member) {
    const canManage = member.member_type === 'CORE_MEMBER';
    return {
      canView: true,
      canEdit: canManage,
      canManageMembers: canManage,
      canManageRoles: canManage,
      canDelete: false,
      canCreateArtifacts: true,
      canCreateMilestones: true,
      canPostUpdates: true,
      memberType: member.member_type as ProjectPermissions['memberType'],
    };
  }

  if (project.visibility === 'PUBLIC') {
    return { ...EMPTY, canView: true };
  }

  return EMPTY;
}

export interface TrialPermissions {
  canView: boolean;
  canEdit: boolean;
  canCreateTasks: boolean;
  canSendMessage: boolean;
  canSubmitReview: boolean;
  canComplete: boolean;
  role: 'OWNER' | 'COLLABORATOR' | null;
}

const EMPTY_TRIAL: TrialPermissions = {
  canView: false,
  canEdit: false,
  canCreateTasks: false,
  canSendMessage: false,
  canSubmitReview: false,
  canComplete: false,
  role: null,
};

export async function resolveTrialPermissions(
  _supabase: DB | null,
  ctx: PermissionContext,
  trialId: string,
): Promise<TrialPermissions> {
  await ensureSeeded();
  const trial = inMemoryDb.trials.get(trialId);
  if (!trial) return EMPTY_TRIAL;

  const member = inMemoryDb.trial_members.findOne(
    (m) => m.trial_id === trialId && m.user_id === ctx.userId,
  );

  if (!member) return EMPTY_TRIAL;

  return {
    canView: true,
    canEdit: member.role === 'OWNER',
    canCreateTasks: true,
    canSendMessage: true,
    canSubmitReview: true,
    canComplete: member.role === 'OWNER',
    role: member.role as 'OWNER' | 'COLLABORATOR',
  };
}

/**
 * Quick helper: throw a 403-shaped error if predicate is false.
 * Use in server actions.
 */
export function assertAllowed(condition: boolean, message = 'Forbidden'): void {
  if (!condition) {
    const err = new Error(message);
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}
