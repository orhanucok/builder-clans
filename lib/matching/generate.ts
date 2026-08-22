/**
 * Matching — generate ranked candidate list for a project role.
 *
 * Inputs:
 *   - project + role required skills / tags
 *   - candidate pool (all users except owner and existing members)
 * Output:
 *   - sorted list of { userId, breakdown, finalScore }.
 *
 * This is a server-only module. Calls supabase to fetch data, then runs
 * the deterministic scorer in config/matching.ts.
 */

import { computeMatchScore, type MatchBreakdown, MATCH_HARD_FILTERS } from '@/config/matching';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { requireUser } from '@/lib/auth/session';

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

interface ProjectRow {
  id: string;
  owner_id: string;
  remote_mode: string;
  weekly_commitment_min: number;
  weekly_commitment_max: number;
  visibility: string;
  tags: string[] | null;
  category: string;
}
interface RoleRow {
  id: string;
  project_id: string;
  title: string;
  required_skills: string[] | null;
  status: string;
}
interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  user_type: string | null;
  weekly_hours: string | null;
  remote_preference: string | null;
  reputation_score: number | null;
  country_code: string | null;
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
  if (!isSupabaseConfigured()) return [];
  const supabase = await createServerSupabase();
  const me = await requireUser();

  // Fetch project
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select(
      'id, owner_id, remote_mode, weekly_commitment_min, weekly_commitment_max, visibility, tags, category',
    )
    .eq('id', projectId)
    .single();
  if (projectErr || !project) return [];
  const proj = project as ProjectRow;

  // Fetch role
  let role: RoleRow | null = null;
  if (roleId) {
    const { data: r } = await supabase
      .from('project_roles')
      .select('id, project_id, title, required_skills, status')
      .eq('id', roleId)
      .single();
    role = (r as RoleRow | null) ?? null;
  }

  // Existing members
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE');
  const excluded = new Set<string>([proj.owner_id, me.id]);
  for (const m of memberRows ?? []) excluded.add(m.user_id as string);

  // Project required skills: from role + from project
  const { data: projectSkillRows } = await supabase
    .from('project_skills')
    .select('skill')
    .eq('project_id', projectId);
  const projectSkills = (projectSkillRows ?? []).map((r) => r.skill as string);
  const roleSkills = role?.required_skills ?? [];

  // Candidate pool: profiles with skills + interests loaded
  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, headline, user_type, weekly_hours, remote_preference, reputation_score, country_code',
    )
    .limit(500);
  const profileList = (profiles ?? []) as ProfileRow[];

  const candidates: MatchCandidate[] = [];
  for (const p of profileList) {
    if (excluded.has(p.id)) continue;
    if (MATCH_HARD_FILTERS.rejectExistingMembers && excluded.has(p.id)) continue;
    const rep = p.reputation_score ?? 50;
    if (rep < MATCH_HARD_FILTERS.minReputation) continue;

    const { data: skillRows } = await supabase
      .from('profile_skills')
      .select('skill')
      .eq('profile_id', p.id);
    const candidateSkills = (skillRows ?? []).map((r) => r.skill as string);

    const { data: interestRows } = await supabase
      .from('profile_interests')
      .select('interest')
      .eq('profile_id', p.id);
    const candidateInterests = (interestRows ?? []).map((r) => r.interest as string);

    const breakdown = computeMatchScore({
      candidateSkills,
      candidateInterests,
      candidateAvailability: (p.weekly_hours ?? null) as never,
      candidateRemote: (p.remote_preference ?? null) as never,
      candidateUserType: (p.user_type ?? null) as never,
      candidateReputation: rep,
      projectRequiredSkills: projectSkills,
      projectTags: proj.tags ?? [],
      projectCommitmentMin: proj.weekly_commitment_min,
      projectCommitmentMax: proj.weekly_commitment_max,
      projectRemote: proj.remote_mode as 'REMOTE' | 'HYBRID' | 'ONSITE',
      roleTitle: role?.title ?? '',
      roleRequiredSkills: roleSkills,
      sameCountry:
        Boolean(p.country_code) &&
        // naive same-country: requires a fetch from project owner; omitted for cost — assume different
        false,
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
  if (!isSupabaseConfigured()) return [];
  const supabase = await createServerSupabase();
  const me = await requireUser();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, user_type, weekly_hours, remote_preference, reputation_score')
    .eq('id', me.id)
    .single();
  if (!myProfile) return [];

  const { data: mySkills } = await supabase
    .from('profile_skills')
    .select('skill')
    .eq('profile_id', me.id);
  const mySkillSet = new Set((mySkills ?? []).map((r) => r.skill as string));

  const { data: openProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('visibility', 'PUBLIC')
    .neq('owner_id', me.id)
    .neq('status', 'COMPLETED')
    .order('created_at', { ascending: false })
    .limit(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = (openProjects ?? []) as any[];
  const out: Array<{ project: (typeof list)[number]; overlap: number }> = [];
  for (const p of list) {
    if (p.owner_id === me.id) continue;
    const { data: ps } = await supabase
      .from('project_skills')
      .select('skill')
      .eq('project_id', p.id);
    const projSkills = (ps ?? []).map((r) => r.skill as string);
    let overlap = 0;
    for (const s of projSkills) if (mySkillSet.has(s)) overlap += 1;
    out.push({ project: p, overlap });
  }
  out.sort((a, b) => b.overlap - a.overlap);
  return out.slice(0, limit).map((x) => x.project);
}
