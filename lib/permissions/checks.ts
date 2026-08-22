/**
 * Builder Clans — Centralized permission helpers.
 *
 * Master plan §84: "Permission helpers merkezi olsun. UI kontrolüne güvenme.
 * Backend'de enforce et."
 *
 * All server actions and route handlers MUST call one of these before
 * mutating. The RLS policies in supabase/migrations are the second line
 * of defense; these helpers are the first.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type DB = SupabaseClient<Database>;

export interface PermissionContext {
  userId: string;
}

/**
 * Project permission flags returned by resolveProjectPermissions.
 */
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
  supabase: DB,
  ctx: PermissionContext,
  projectId: string,
): Promise<ProjectPermissions> {
  // Fetch the project visibility + owner
  const { data: project } = await supabase
    .from('projects')
    .select('id, owner_id, visibility, status')
    .eq('id', projectId)
    .maybeSingle();

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

  // Is the user a member?
  const { data: member } = await supabase
    .from('project_members')
    .select('member_type, status')
    .eq('project_id', projectId)
    .eq('user_id', ctx.userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

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

  // Public visibility: anyone can view
  if (project.visibility === 'PUBLIC') {
    return { ...EMPTY, canView: true };
  }

  return EMPTY;
}

/**
 * Trial permission flags.
 */
export interface TrialPermissions {
  canView: boolean;
  canEdit: boolean;
  canCreateTasks: boolean;
  canSendMessage: boolean;
  canSubmitReview: boolean;
  canComplete: boolean;
  role: 'OWNER' | 'COLLABORATOR' | null;
}

export async function resolveTrialPermissions(
  supabase: DB,
  ctx: PermissionContext,
  trialId: string,
): Promise<TrialPermissions> {
  const { data: trial } = await supabase
    .from('trials')
    .select('id, project_id, status, owner_id')
    .eq('id', trialId)
    .maybeSingle();
  if (!trial) {
    return {
      canView: false,
      canEdit: false,
      canCreateTasks: false,
      canSendMessage: false,
      canSubmitReview: false,
      canComplete: false,
      role: null,
    };
  }

  const { data: member } = await supabase
    .from('trial_members')
    .select('user_id, role')
    .eq('trial_id', trialId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!member) {
    return {
      canView: false,
      canEdit: false,
      canCreateTasks: false,
      canSendMessage: false,
      canSubmitReview: false,
      canComplete: false,
      role: null,
    };
  }

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
