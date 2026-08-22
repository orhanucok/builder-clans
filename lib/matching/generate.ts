/**
 * Matching — generate ranked candidate list for a project role.
 *
 * Inputs:
 *   - project + role required skills / tags
 *   - candidate pool (all users except owner and existing members)
 * Output:
 *   - sorted list of { userId, breakdown, finalScore }.
 *
 * Reads from the active data store (Supabase when configured, in-memory
 * otherwise). The candidate scoring algorithm itself stays in
 * config/matching.ts and is fully deterministic.
 */

import { computeMatchScore, type MatchBreakdown, MATCH_HARD_FILTERS } from '@/config/matching';
import { ensureSeeded, db } from '@/lib/db/store';
import { getProjectSkills, getProfileSkills, getProfileInterests } from '@/lib/db/store/queries';
import { getCurrentUser } from '@/lib/auth/session';

export interface MatchCandidate {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  userType: string | null;
  skills: string[];
  interests: string[];
  weeklyHours: string | null;
  remotePreference: string | null;
  reputation: number;
  countryCode: string | null;
  breakdown: MatchBreakdown;
}

/**
 * Generate ranked candidate list for a project role. Returns at most
 * `limit` candidates (default 25).
 */
export async function generateCandidatesForRole(
  projectId: string,
  roleId: string | null,
  limit = 25,
): Promise<MatchCandidate[]> {
  await ensureSeeded();
  const me = await getCurrentUser();

  const project = db.projects.get(projectId);
  if (!project) return [];
  const role = roleId ? db.project_roles.get(roleId) : null;

  // Existing members
  const memberRows = db.project_members.list({ project_id: projectId, status: 'ACTIVE' });
  const excluded = new Set<string>([project.owner_id]);
  if (me) excluded.add(me.id);
  for (const m of memberRows) excluded.add(m.user_id);

  const projectSkills = getProjectSkills(projectId);
  const roleSkills = role?.required_skills ?? [];

  // Candidate pool: all profiles
  const allProfiles = db.profiles.all();
  const candidates: MatchCandidate[] = [];
  for (const p of allProfiles) {
    if (excluded.has(p.id)) continue;
    if (MATCH_HARD_FILTERS.rejectExistingMembers && excluded.has(p.id)) continue;
    const rep = p.reputation_score ?? 50;
    if (rep < MATCH_HARD_FILTERS.minReputation) continue;

    const candidateSkills = getProfileSkills(p.id);
    const candidateInterests = getProfileInterests(p.id);

    const breakdown = computeMatchScore({
      candidateSkills,
      candidateInterests,
      candidateAvailability: p.weekly_hours,
      candidateRemote: p.remote_preference,
      candidateUserType: p.user_type,
      candidateReputation: rep,
      projectRequiredSkills: projectSkills,
      projectTags: project.tags ?? [],
      projectCommitmentMin: project.weekly_commitment_min,
      projectCommitmentMax: project.weekly_commitment_max,
      projectRemote: project.remote_mode,
      roleTitle: role?.title ?? '',
      roleRequiredSkills: roleSkills,
      sameCountry: false,
      sameCity: false,
    });

    candidates.push({
      userId: p.id,
      displayName: p.display_name,
      username: p.username,
      avatarUrl: p.avatar_url,
      headline: p.headline,
      userType: p.user_type,
      skills: candidateSkills,
      interests: candidateInterests,
      weeklyHours: p.weekly_hours,
      remotePreference: p.remote_preference,
      reputation: rep,
      countryCode: p.country_code,
      breakdown,
    });
  }

  candidates.sort((a, b) => b.breakdown.final - a.breakdown.final);
  return candidates.slice(0, limit);
}

/**
 * Find projects the current user could match for. Used in /discover and
 * on the "Aha moment" CTA after onboarding.
 */
export async function suggestProjectsForCurrentUser(limit = 10) {
  await ensureSeeded();
  const me = await getCurrentUser();
  if (!me) return [];

  const myProfile = db.profiles.get(me.id);
  if (!myProfile) return [];

  const mySkills = new Set(getProfileSkills(me.id));

  const openProjects = db.projects
    .all()
    .filter((p) => p.visibility === 'PUBLIC' && p.owner_id !== me.id && p.status !== 'COMPLETED')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  const out: Array<{ project: typeof openProjects[number]; overlap: number }> = [];
  for (const p of openProjects) {
    const projSkills = getProjectSkills(p.id);
    let overlap = 0;
    for (const s of projSkills) if (mySkills.has(s)) overlap += 1;
    out.push({ project: p, overlap });
  }
  out.sort((a, b) => b.overlap - a.overlap);
  return out.slice(0, limit).map((x) => x.project);
}
