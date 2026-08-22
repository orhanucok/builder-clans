import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
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

interface ProjectRow {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  short_description: string;
  category: ProjectCategory;
  stage: ProjectStage;
  remote_mode: RemoteMode;
  location: string | null;
  weekly_commitment_min: number;
  weekly_commitment_max: number;
  tags: string[] | null;
  status: string;
  created_at: string;
}

interface OwnerRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/**
 * Fetch projects matching filters and decorate with member count and
 * open role summary. Server-only.
 */
export async function listProjects(filters: ProjectListFilters): Promise<ProjectCardData[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createServerSupabase();
  let q = supabase
    .from('projects')
    .select(
      'id, owner_id, slug, title, short_description, category, stage, remote_mode, location, weekly_commitment_min, weekly_commitment_max, tags, status, created_at',
    )
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 30);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.stage) q = q.eq('stage', filters.stage);
  if (filters.remoteMode) q = q.eq('remote_mode', filters.remoteMode);
  if (filters.ownerId) q = q.eq('owner_id', filters.ownerId);
  if (filters.query) {
    // Simple ILIKE across title/description
    q = q.or(
      `title.ilike.%${filters.query}%,short_description.ilike.%${filters.query}%,description.ilike.%${filters.query}%`,
    );
  }
  const { data: projects } = await q;
  const list = (projects ?? []) as ProjectRow[];
  if (list.length === 0) return [];

  // Owner profiles
  const ownerIds = Array.from(new Set(list.map((p) => p.owner_id)));
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ownerIds);
  const ownerMap = new Map<string, OwnerRow>(((owners ?? []) as OwnerRow[]).map((o) => [o.id, o]));

  // Member counts
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('project_id, user_id')
    .in('project_id', list.map((p) => p.id))
    .eq('status', 'ACTIVE');
  const memberCount = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCount.set(m.project_id as string, (memberCount.get(m.project_id as string) ?? 0) + 1);
  }

  // Open roles
  const { data: roleRows } = await supabase
    .from('project_roles')
    .select('project_id, title, status')
    .in('project_id', list.map((p) => p.id))
    .eq('status', 'OPEN');
  const roleMap = new Map<string, string[]>();
  for (const r of roleRows ?? []) {
    const arr = roleMap.get(r.project_id as string) ?? [];
    arr.push(r.title as string);
    roleMap.set(r.project_id as string, arr);
  }

  const out: ProjectCardData[] = list
    .filter((p) => !filters.excludeIds || !filters.excludeIds.includes(p.id))
    .map((p) => {
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
