/**
 * Store-agnostic query helpers.
 *
 * These functions return plain row objects from the active data store. They
 * hide the difference between Supabase and in-memory. Call-sites use these
 * instead of touching the store directly so the matching, listing, and
 * filtering logic stays consistent across the app.
 */

import { db } from './index';
import type { Row } from './memory';

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function getProfileById(id: string): Row<'profiles'> | null {
  return db.profiles.get(id);
}

export function getProfileByUsername(username: string): Row<'profiles'> | null {
  return db.profiles.findOne((p) => p.username === username);
}

export function getProfileByEmail(email: string): Row<'profiles'> | null {
  return db.profiles.findOne((p) => (p as unknown as { email?: string }).email === email.trim().toLowerCase());
}

export function listProfiles(filter?: { user_type?: string; q?: string }): Row<'profiles'>[] {
  let rows = db.profiles.all();
  if (filter?.user_type) rows = rows.filter((r) => r.user_type === filter.user_type);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((r) =>
      r.username.toLowerCase().includes(q) ||
      r.display_name.toLowerCase().includes(q) ||
      (r.headline ?? '').toLowerCase().includes(q),
    );
  }
  return rows;
}

export function upsertProfile(row: Partial<Row<'profiles'>> & { id: string; username: string; display_name: string }): Row<'profiles'> {
  return db.profiles.upsert(row as never);
}

export function updateProfile(id: string, patch: Partial<Row<'profiles'>>): Row<'profiles'> | null {
  return db.profiles.update(id, patch as never);
}

export function getProfileSkills(profileId: string): string[] {
  return db.profile_skills.list({ profile_id: profileId }).map((r) => (r as unknown as { skill: string }).skill);
}

export function setProfileSkills(profileId: string, skills: string[]): void {
  const existing = db.profile_skills.list({ profile_id: profileId });
  for (const e of existing) db.profile_skills.delete((e as { id: string }).id);
  for (const s of skills) db.profile_skills.insert({ profile_id: profileId, skill: s });
}

export function getProfileInterests(profileId: string): string[] {
  return db.profile_interests.list({ profile_id: profileId }).map((r) => (r as unknown as { interest: string }).interest);
}

export function setProfileInterests(profileId: string, interests: string[]): void {
  const existing = db.profile_interests.list({ profile_id: profileId });
  for (const e of existing) db.profile_interests.delete((e as { id: string }).id);
  for (const s of interests) db.profile_interests.insert({ profile_id: profileId, interest: s });
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface ProjectFilters {
  q?: string;
  category?: string;
  stage?: string;
  remoteMode?: string;
  needsTeammates?: boolean;
  ownerId?: string;
  limit?: number;
  orderBy?: 'newest' | 'oldest' | 'most_active';
}

export function listProjects(filters: ProjectFilters = {}): Row<'projects'>[] {
  let rows = db.projects.list();
  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.short_description.toLowerCase().includes(q) ||
        (r.tags ?? []).some((t: string) => t.toLowerCase().includes(q)),
    );
  }
  if (filters.category) rows = rows.filter((r) => r.category === filters.category);
  if (filters.stage) rows = rows.filter((r) => r.stage === filters.stage);
  if (filters.remoteMode) rows = rows.filter((r) => r.remote_mode === filters.remoteMode);
  if (filters.ownerId) rows = rows.filter((r) => r.owner_id === filters.ownerId);
  if (filters.needsTeammates) {
    const openRoleProjectIds = new Set(
      db.project_roles.list({ status: 'OPEN' }).map((r) => (r as { project_id: string }).project_id),
    );
    rows = rows.filter((r) => openRoleProjectIds.has(r.id) && r.status === 'ACTIVE');
  }
  if (filters.orderBy === 'newest') rows = rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (filters.orderBy === 'oldest') rows = rows.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (filters.limit) rows = rows.slice(0, filters.limit);
  return rows;
}

export function getProjectById(id: string): Row<'projects'> | null {
  return db.projects.get(id);
}

export function getProjectBySlug(slug: string): Row<'projects'> | null {
  return db.projects.findOne((p) => p.slug === slug);
}

export function getProjectSkills(projectId: string): string[] {
  return db.project_skills.list({ project_id: projectId }).map((r) => (r as unknown as { skill: string }).skill);
}

export function setProjectSkills(projectId: string, skills: string[]): void {
  const existing = db.project_skills.list({ project_id: projectId });
  for (const e of existing) db.project_skills.delete((e as { id: string }).id);
  for (const s of skills) db.project_skills.insert({ project_id: projectId, skill: s });
}

export function createProject(input: Partial<Row<'projects'>> & { owner_id: string; title: string; short_description: string; description: string; category: string; stage: string; remote_mode: string; weekly_commitment_min: number; weekly_commitment_max: number }): Row<'projects'> {
  return db.projects.insert(input as never);
}

export function updateProject(id: string, patch: Partial<Row<'projects'>>): Row<'projects'> | null {
  return db.projects.update(id, patch as never);
}

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

export function listProjectMembers(projectId: string): Row<'project_members'>[] {
  return db.project_members.list({ project_id: projectId });
}

export function isProjectMember(projectId: string, userId: string): boolean {
  return db.project_members.findOne(
    (m) => m.project_id === projectId && m.user_id === userId && m.status === 'ACTIVE',
  ) !== null;
}

export function addProjectMember(projectId: string, userId: string, memberType: string, roleTitle?: string): Row<'project_members'> {
  return db.project_members.insert({
    project_id: projectId, user_id: userId, member_type: memberType as never, status: 'ACTIVE',
    role_title: roleTitle ?? null, joined_at: new Date().toISOString(), left_at: null,
  } as never);
}

// ---------------------------------------------------------------------------
// Project roles
// ---------------------------------------------------------------------------

export function listProjectRoles(projectId: string): Row<'project_roles'>[] {
  return db.project_roles.list({ project_id: projectId });
}

export function getProjectRoleById(id: string): Row<'project_roles'> | null {
  return db.project_roles.get(id);
}

export function createProjectRole(input: { project_id: string; title: string; description?: string; commitment_min: number; commitment_max: number; experience_level: string; required_skills: string[] }): Row<'project_roles'> {
  return db.project_roles.insert({
    project_id: input.project_id, title: input.title, description: input.description ?? null,
    commitment_min: input.commitment_min, commitment_max: input.commitment_max,
    experience_level: input.experience_level as never, required_skills: input.required_skills,
    status: 'OPEN', created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export function listApplicationsForProject(projectId: string): Row<'applications'>[] {
  return db.applications.list({ project_id: projectId });
}

export function listApplicationsByUser(userId: string): Row<'applications'>[] {
  return db.applications.list({ applicant_id: userId });
}

export function getApplication(id: string): Row<'applications'> | null {
  return db.applications.get(id);
}

export function createApplication(input: { project_id: string; role_id: string | null; applicant_id: string; why_interested?: string; contribution?: string; hours_per_week?: number; relevant_work_url?: string; note?: string }): Row<'applications'> {
  return db.applications.insert({
    project_id: input.project_id, role_id: input.role_id, applicant_id: input.applicant_id,
    why_interested: input.why_interested ?? null, contribution: input.contribution ?? null,
    hours_per_week: input.hours_per_week ?? null, relevant_work_url: input.relevant_work_url ?? null,
    note: input.note ?? null, status: 'PENDING', created_at: new Date().toISOString(), decided_at: null,
  } as never);
}

export function updateApplication(id: string, patch: Partial<Row<'applications'>>): Row<'applications'> | null {
  return db.applications.update(id, patch as never);
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export function listMatchesForUser(userId: string): Row<'matches'>[] {
  return db.matches.list((m) => m.candidate_user_id === userId || m.initiator_user_id === userId);
}

export function getMatch(id: string): Row<'matches'> | null {
  return db.matches.get(id);
}

export function createMatch(input: { project_id: string; role_id: string | null; initiator_user_id: string; candidate_user_id: string; status?: string; final_score?: number }): Row<'matches'> {
  return db.matches.insert({
    project_id: input.project_id, role_id: input.role_id,
    initiator_user_id: input.initiator_user_id, candidate_user_id: input.candidate_user_id,
    status: (input.status ?? 'SUGGESTED') as never, final_score: input.final_score ?? null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as never);
}

export function updateMatch(id: string, patch: Partial<Row<'matches'>>): Row<'matches'> | null {
  return db.matches.update(id, patch as never);
}

export function getMatchScore(matchId: string): Row<'match_scores'> | null {
  return db.match_scores.findOne((m) => (m as { match_id: string }).match_id === matchId);
}

// ---------------------------------------------------------------------------
// Trials
// ---------------------------------------------------------------------------

export function listTrialsForUser(userId: string): Row<'trials'>[] {
  const memberRows = db.trial_members.list({ user_id: userId });
  const trialIds = new Set(memberRows.map((m) => (m as { trial_id: string }).trial_id));
  return db.trials.list((t) => trialIds.has(t.id) || t.owner_id === userId);
}

export function listTrialsForProject(projectId: string): Row<'trials'>[] {
  return db.trials.list({ project_id: projectId });
}

export function getTrial(id: string): Row<'trials'> | null {
  return db.trials.get(id);
}

export function createTrial(input: { project_id: string; role_id: string | null; match_id: string | null; owner_id: string; goal: string; deliverables: string[]; duration_days: number }): Row<'trials'> {
  const now = new Date();
  const ends = new Date(now.getTime() + input.duration_days * 86_400_000);
  return db.trials.insert({
    project_id: input.project_id, role_id: input.role_id, match_id: input.match_id,
    owner_id: input.owner_id, status: 'ACTIVE', goal: input.goal, deliverables: input.deliverables,
    duration_days: input.duration_days, starts_at: now.toISOString(), ends_at: ends.toISOString(),
    created_at: now.toISOString(),
  } as never);
}

export function updateTrial(id: string, patch: Partial<Row<'trials'>>): Row<'trials'> | null {
  return db.trials.update(id, patch as never);
}

export function listTrialMembers(trialId: string): Row<'trial_members'>[] {
  return db.trial_members.list({ trial_id: trialId });
}

export function addTrialMember(trialId: string, userId: string, role: 'OWNER' | 'COLLABORATOR'): Row<'trial_members'> {
  return db.trial_members.insert({
    trial_id: trialId, user_id: userId, role, status: 'ACTIVE', joined_at: new Date().toISOString(),
  } as never);
}

export function getTrialReview(trialId: string, reviewerId: string): Row<'trial_reviews'> | null {
  return db.trial_reviews.findOne((r) => (r as { trial_id: string; reviewer_id: string }).trial_id === trialId && (r as { reviewer_id: string }).reviewer_id === reviewerId);
}

export function createTrialReview(input: Omit<Row<'trial_reviews'>, 'id' | 'created_at'>): Row<'trial_reviews'> {
  return db.trial_reviews.insert(input as never);
}

export function listTrialReviews(trialId: string): Row<'trial_reviews'>[] {
  return db.trial_reviews.list({ trial_id: trialId });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function listTasksForProject(projectId: string): Row<'tasks'>[] {
  return db.tasks.list({ project_id: projectId });
}

export function listTasksForTrial(trialId: string): Row<'tasks'>[] {
  return db.tasks.list({ trial_id: trialId });
}

export function getTask(id: string): Row<'tasks'> | null {
  return db.tasks.get(id);
}

export function createTask(input: { project_id?: string; trial_id?: string; title: string; description?: string; priority?: string; assignee_id?: string; due_date?: string; created_by: string }): Row<'tasks'> {
  return db.tasks.insert({
    project_id: input.project_id ?? null, trial_id: input.trial_id ?? null, milestone_id: null,
    title: input.title, description: input.description ?? null,
    status: 'TODO', priority: (input.priority ?? 'MEDIUM') as never,
    assignee_id: input.assignee_id ?? null, due_date: input.due_date ?? null,
    created_by: input.created_by, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as never);
}

export function updateTask(id: string, patch: Partial<Row<'tasks'>>): Row<'tasks'> | null {
  return db.tasks.update(id, patch as never);
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export function listMilestones(projectId: string): Row<'milestones'>[] {
  return db.milestones.list({ project_id: projectId });
}

export function createMilestone(input: { project_id: string; title: string; description?: string; target_date?: string }): Row<'milestones'> {
  return db.milestones.insert({
    project_id: input.project_id, title: input.title, description: input.description ?? null,
    status: 'OPEN', target_date: input.target_date ?? null, completed_at: null,
    created_at: new Date().toISOString(),
  } as never);
}

export function updateMilestone(id: string, patch: Partial<Row<'milestones'>>): Row<'milestones'> | null {
  return db.milestones.update(id, patch as never);
}

// ---------------------------------------------------------------------------
// Project updates
// ---------------------------------------------------------------------------

export function listProjectUpdates(projectId: string): Row<'project_updates'>[] {
  return db.project_updates.list((u) => (u as { project_id: string }).project_id === projectId).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createProjectUpdate(input: { project_id: string; author_id: string; body: string; visibility: string }): Row<'project_updates'> {
  return db.project_updates.insert({
    project_id: input.project_id, author_id: input.author_id, body: input.body,
    visibility: input.visibility as never, created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export function listArtifacts(projectId: string): Row<'artifacts'>[] {
  return db.artifacts.list((a) => (a as { project_id: string }).project_id === projectId).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createArtifact(input: { project_id: string; title: string; type: string; url: string; description?: string; creator_id: string }): Row<'artifacts'> {
  return db.artifacts.insert({
    project_id: input.project_id, title: input.title, type: input.type as never, url: input.url,
    description: input.description ?? null, creator_id: input.creator_id, created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export function listContributionsForUser(userId: string): Row<'contributions'>[] {
  return db.contributions.list((c) => (c as { user_id: string }).user_id === userId);
}

export function listContributionsForProject(projectId: string): Row<'contributions'>[] {
  return db.contributions.list((c) => (c as { project_id: string }).project_id === projectId);
}

export function createContribution(input: { user_id: string; project_id: string; type: string; description: string; evidence_url?: string; verified_by?: string }): Row<'contributions'> {
  return db.contributions.insert({
    user_id: input.user_id, project_id: input.project_id, type: input.type as never,
    description: input.description, evidence_url: input.evidence_url ?? null,
    verified_by: input.verified_by ?? null, created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// Channels & messages
// ---------------------------------------------------------------------------

export function getProjectChannel(projectId: string): Row<'channels'> | null {
  return db.channels.findOne((c) => (c as { project_id: string | null }).project_id === projectId);
}

export function getTrialChannel(trialId: string): Row<'channels'> | null {
  return db.channels.findOne((c) => (c as { trial_id: string | null }).trial_id === trialId);
}

export function getOrCreateProjectChannel(projectId: string, name: string): Row<'channels'> {
  const existing = getProjectChannel(projectId);
  if (existing) return existing;
  return db.channels.insert({
    type: 'PROJECT', project_id: projectId, trial_id: null, clan_id: null, name,
    created_at: new Date().toISOString(),
  } as never);
}

export function getOrCreateTrialChannel(trialId: string, name: string): Row<'channels'> {
  const existing = getTrialChannel(trialId);
  if (existing) return existing;
  return db.channels.insert({
    type: 'TRIAL', project_id: null, trial_id: trialId, clan_id: null, name,
    created_at: new Date().toISOString(),
  } as never);
}

export function listMessages(channelId: string, limit = 50): Row<'messages'>[] {
  return db.messages.list((m) => (m as { channel_id: string }).channel_id === channelId)
    .slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export function createMessage(input: { channel_id: string; sender_id: string; content: string; reply_to?: string }): Row<'messages'> {
  return db.messages.insert({
    channel_id: input.channel_id, sender_id: input.sender_id, content: input.content,
    reply_to: input.reply_to ?? null, edited_at: null, deleted_at: null, created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// XP + reputation
// ---------------------------------------------------------------------------

export function listXpEventsForUser(userId: string): Row<'xp_events'>[] {
  return db.xp_events.list((e) => (e as { user_id: string }).user_id === userId);
}

export function recordXpEvent(input: { user_id: string; event_type: string; entity_type?: string; entity_id?: string; idempotency_key: string; xp_amount: number }): Row<'xp_events'> | null {
  // Idempotency: check existing
  const existing = db.xp_events.findOne(
    (e) => (e as { idempotency_key: string }).idempotency_key === input.idempotency_key,
  );
  if (existing) return existing;
  return db.xp_events.insert({
    user_id: input.user_id, event_type: input.event_type as never,
    entity_type: input.entity_type ?? null, entity_id: input.entity_id ?? null,
    idempotency_key: input.idempotency_key, xp_amount: input.xp_amount,
    created_at: new Date().toISOString(),
  } as never);
}

export function listReputationEventsForUser(userId: string): Row<'reputation_events'>[] {
  return db.reputation_events.list((e) => (e as { user_id: string }).user_id === userId);
}

export function recordReputationEvent(input: { user_id: string; source: string; source_id?: string; source_type?: string; delta: number; weight: number; reason: string }): Row<'reputation_events'> {
  return db.reputation_events.insert({
    user_id: input.user_id, source: input.source as never, source_id: input.source_id ?? null,
    source_type: input.source_type ?? null, delta: input.delta, weight: input.weight, reason: input.reason,
    created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function listNotificationsForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}): Row<'notifications'>[] {
  let rows = db.notifications.list((n) => (n as { user_id: string }).user_id === userId);
  if (opts.unreadOnly) rows = rows.filter((r) => r.read_at === null);
  rows = rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (opts.limit) rows = rows.slice(0, opts.limit);
  return rows;
}

export function createNotification(input: { user_id: string; type: string; title: string; body?: string; link?: string }): Row<'notifications'> {
  return db.notifications.insert({
    user_id: input.user_id, type: input.type as never, title: input.title,
    body: input.body ?? null, link: input.link ?? null, read_at: null,
    created_at: new Date().toISOString(),
  } as never);
}

export function markNotificationRead(id: string): Row<'notifications'> | null {
  return db.notifications.update(id, { read_at: new Date().toISOString() } as never);
}

// ---------------------------------------------------------------------------
// Saved projects (bookmarks)
// ---------------------------------------------------------------------------

export function listSavedProjectsForUser(userId: string) {
  return db.saved_projects.list((s) => (s as { user_id: string }).user_id === userId)
    .sort((a, b) => (b as { created_at: string }).created_at.localeCompare((a as { created_at: string }).created_at));
}

export function saveProjectBookmark(userId: string, projectId: string) {
  return db.saved_projects.insert({
    user_id: userId,
    project_id: projectId,
    created_at: new Date().toISOString(),
  } as never);
}

export function removeSavedProject(userId: string, projectId: string) {
  const row = db.saved_projects.findOne(
    (s) => (s as { user_id: string; project_id: string }).user_id === userId
      && (s as { project_id: string }).project_id === projectId,
  );
  if (row) db.saved_projects.delete((row as { id: string }).id);
}

// ---------------------------------------------------------------------------
// Clans
// ---------------------------------------------------------------------------

export function listClans(filter?: { type?: string; q?: string }): Row<'clans'>[] {
  let rows = db.clans.all();
  if (filter?.type) rows = rows.filter((r) => r.type === filter.type);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
  }
  return rows;
}

export function getClanBySlug(slug: string): Row<'clans'> | null {
  return db.clans.findOne((c) => c.slug === slug);
}

export function getClanById(id: string): Row<'clans'> | null {
  return db.clans.get(id);
}

export function listClanMembers(clanId: string): Row<'clan_members'>[] {
  return db.clan_members.list({ clan_id: clanId });
}

export function isClanMember(clanId: string, userId: string): boolean {
  return db.clan_members.findOne((m) => (m as { clan_id: string; user_id: string }).clan_id === clanId && (m as { user_id: string }).user_id === userId) !== null;
}

interface ClanCreateInput {
  name: string;
  description: string | null;
  type: string;
  owner_id: string;
  institution: string | null;
  country_code: string | null;
}

export function createClan(input: ClanCreateInput): Row<'clans'> {
  const baseSlug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  let slug = baseSlug || 'clan';
  let suffix = 0;
  while (getClanBySlug(slug)) {
    suffix += 1;
    if (suffix > 50) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
      break;
    }
    slug = `${baseSlug}-${suffix}`;
  }
  const id = `cln_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
  const clan = db.clans.insert({
    id,
    slug,
    name: input.name,
    description: input.description,
    type: input.type as never,
    institution: input.institution,
    country_code: input.country_code,
    visibility: 'PUBLIC' as never,
    owner_id: input.owner_id,
    xp: 0,
    lifetime_xp: 0,
    created_at: new Date().toISOString(),
  } as never);
  db.clan_members.insert({
    clan_id: id,
    user_id: input.owner_id,
    role: 'OWNER' as never,
    joined_at: new Date().toISOString(),
  } as never);
  return clan;
}

export interface ClanActionResult {
  ok: boolean;
  error?: string;
  slug?: string;
}

export function joinClan(clanId: string, userId: string): ClanActionResult {
  if (!clanId || !userId) return { ok: false, error: 'Missing clan or user.' };
  const clan = getClanById(clanId);
  if (!clan) return { ok: false, error: 'Clan not found.' };
  if (isClanMember(clanId, userId)) return { ok: false, error: 'Already a member.' };
  db.clan_members.insert({
    clan_id: clanId,
    user_id: userId,
    role: 'MEMBER' as never,
    joined_at: new Date().toISOString(),
  } as never);
  return { ok: true, slug: clan.slug };
}

export function leaveClan(clanId: string, userId: string): ClanActionResult {
  if (!clanId || !userId) return { ok: false, error: 'Missing clan or user.' };
  const clan = getClanById(clanId);
  if (!clan) return { ok: false, error: 'Clan not found.' };
  if (clan.owner_id === userId) return { ok: false, error: 'Owner cannot leave their own clan.' };
  const member = db.clan_members.findOne(
    (m) => (m as { clan_id: string; user_id: string }).clan_id === clanId && (m as { user_id: string }).user_id === userId,
  );
  if (!member) return { ok: false, error: 'You are not a member of this clan.' };
  db.clan_members.delete((member as { id: string }).id);
  return { ok: true, slug: clan.slug };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function createReport(input: { reporter_id: string; reason: string; description?: string; target_user_id?: string; target_project_id?: string; target_message_id?: string }): Row<'reports'> {
  return db.reports.insert({
    reporter_id: input.reporter_id, reason: input.reason as never, description: input.description ?? null,
    target_user_id: input.target_user_id ?? null, target_project_id: input.target_project_id ?? null,
    target_message_id: input.target_message_id ?? null, status: 'OPEN',
    created_at: new Date().toISOString(),
  } as never);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function recordAnalyticsEvent(event: string, userId: string | null, properties?: Record<string, unknown>): void {
  db.analytics_events.insert({
    event, user_id: userId, properties: (properties ?? null) as never,
    created_at: new Date().toISOString(),
  } as never);
}
