import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { listProjects } from '@/lib/db/queries/projects';
import { listSavedProjectsForUser, getProfileById, getProjectSkills } from '@/lib/db/store/queries';
import { ensureSeeded, db } from '@/lib/db/store';
import { ProjectCard, type ProjectCardData } from '@/components/project/project-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = { title: 'Saved projects' };
export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  await ensureSeeded();
  const me = await getCurrentUser();
  if (!me) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          title="Log in to see your saved projects"
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const saved = listSavedProjectsForUser(me.id);
  if (saved.length === 0) {
    return (
      <div className="container-wide py-10">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bookmark className="h-5 w-5" /> Saved
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects you bookmark for later. Click the bookmark icon on any project card.
          </p>
        </header>
        <EmptyState
          icon={<Bookmark className="h-10 w-10" />}
          title="No saved projects yet"
          description="When you find a project you want to follow, click the bookmark icon. It'll show up here."
          action={
            <Button asChild>
              <Link href="/discover">Browse projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Fetch full project data
  const projectIds = new Set(saved.map((s) => (s as { project_id: string }).project_id));
  const allProjects = (db.projects.all() as any[]).filter((p) => projectIds.has(p.id));
  const owners = (db.profiles.all() as any).filter((o) =>
    allProjects.some((p) => p.owner_id === o.id),
  );
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  // Member counts
  const memberRows = db.project_members.all().filter(
    (m) => projectIds.has((m as { project_id: string }).project_id)
      && (m as { status: string }).status === 'ACTIVE',
  );
  const memberCount = new Map<string, number>();
  for (const m of memberRows) {
    const k = (m as { project_id: string }).project_id;
    memberCount.set(k, (memberCount.get(k) ?? 0) + 1);
  }

  // Open roles
  const roleRows = db.project_roles.all().filter(
    (r) => projectIds.has((r as { project_id: string }).project_id)
      && (r as { status: string }).status === 'OPEN',
  );
  const roleMap = new Map<string, string[]>();
  for (const r of roleRows) {
    const k = (r as { project_id: string }).project_id;
    const arr = roleMap.get(k) ?? [];
    arr.push(r.title);
    roleMap.set(k, arr);
  }

  const cards: ProjectCardData[] = allProjects
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => {
      const owner = ownerMap.get(p.owner_id);
      const openRoles = roleMap.get(p.id) ?? [];
      return {
        id: p.id, slug: p.slug, title: p.title, shortDescription: p.short_description,
        category: p.category, stage: p.stage, remoteMode: p.remote_mode, location: p.location,
        weeklyCommitmentMin: p.weekly_commitment_min, weeklyCommitmentMax: p.weekly_commitment_max,
        owner: {
          displayName: owner?.display_name ?? 'Unknown',
          username: owner?.username ?? 'unknown',
          avatarUrl: owner?.avatar_url ?? null,
        },
        memberCount: (memberCount.get(p.id) ?? 0) + 1,
        openRoleCount: openRoles.length,
        openRoleTitles: openRoles,
        lookingFor: openRoles,
        tags: p.tags ?? [],
        coverImageUrl: p.cover_image_url ?? null,
        isSaved: true,
      };
    });

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Bookmark className="h-5 w-5" /> Saved
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cards.length} project{cards.length === 1 ? '' : 's'} you bookmarked.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((p) => (
          <ProjectCard key={p.id} data={p} />
        ))}
      </div>
    </div>
  );
}
