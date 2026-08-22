/**
 * Project list query — server-only.
 *
 * Reads from the active data store (Supabase when configured, in-memory
 * otherwise) and decorates each row with member count + open role summary
 * for use in cards.
 */

import { db, ensureSeeded } from '@/lib/db/store';
import type { ProjectCategory, ProjectStage, RemoteMode } from '@/config/constants';
import type { ProjectCardData } from '@/components/project/project-card';

export interface ProjectListFilters {
  category?: ProjectCategory | null;
  stage?: ProjectStage | null;
  remoteMode?: RemoteMode | null;
  query?: string | null;
  needsTeammates?: boolean;
  ownerId?: string | null;
  excludeIds?: string[];
  limit?: number;
}

/**
 * Fetch projects matching filters and decorate with member count and
 * open role summary. Server-only.
 */
export async function listProjects(filters: ProjectListFilters): Promise<ProjectCardData[]> {
  await ensureSeeded();

  // Pull the candidate projects from the store
  let projects = db.projects.all();

  if (filters.ownerId) projects = projects.filter((p) => p.owner_id === filters.ownerId);
  if (filters.category) projects = projects.filter((p) => p.category === filters.category);
  if (filters.stage) projects = projects.filter((p) => p.stage === filters.stage);
  if (filters.remoteMode) projects = projects.filter((p) => p.remote_mode === filters.remoteMode);
  if (filters.query) {
    const q = filters.query.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => (t as string).toLowerCase().includes(q)),
    );
  }
  if (filters.excludeIds) {
    const ex = new Set(filters.excludeIds);
    projects = projects.filter((p) => !ex.has(p.id));
  }

  projects = projects
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, filters.limit ?? 30);

  if (projects.length === 0) return [];

  // Owners
  const ownerIds = Array.from(new Set(projects.map((p) => p.owner_id)));
  const owners = db.profiles.all().filter((o) => ownerIds.includes(o.id));
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  // Member counts
  const projectIds = new Set(projects.map((p) => p.id));
  const memberRows = db.project_members.all().filter(
    (m) => projectIds.has(m.project_id) && m.status === 'ACTIVE',
  );
  const memberCount = new Map<string, number>();
  for (const m of memberRows) {
    memberCount.set(m.project_id, (memberCount.get(m.project_id) ?? 0) + 1);
  }

  // Open roles
  const roleRows = db.project_roles.all().filter(
    (r) => projectIds.has(r.project_id) && r.status === 'OPEN',
  );
  const roleMap = new Map<string, string[]>();
  for (const r of roleRows) {
    const arr = roleMap.get(r.project_id) ?? [];
    arr.push(r.title);
    roleMap.set(r.project_id, arr);
  }

  const out: ProjectCardData[] = projects.map((p) => {
    const owner = ownerMap.get(p.owner_id);
    const openRoles = roleMap.get(p.id) ?? [];
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      shortDescription: p.short_description,
      category: p.category,
      stage: p.stage,
      remoteMode: p.remote_mode,
      location: p.location,
      weeklyCommitmentMin: p.weekly_commitment_min,
      weeklyCommitmentMax: p.weekly_commitment_max,
      owner: {
        displayName: owner?.display_name ?? 'Unknown',
        username: owner?.username ?? 'unknown',
        avatarUrl: owner?.avatar_url ?? null,
      },
      memberCount: (memberCount.get(p.id) ?? 0) + 1, // include owner
      openRoleCount: openRoles.length,
      openRoleTitles: openRoles,
      lookingFor: openRoles,
      tags: p.tags ?? [],
    };
  });

  if (filters.needsTeammates) {
    return out.filter((p) => p.openRoleCount > 0);
  }
  return out;
}
