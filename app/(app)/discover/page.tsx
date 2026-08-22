import Link from 'next/link';
import { listProjects } from '@/lib/db/queries/projects';
import { suggestProjectsForCurrentUser } from '@/lib/matching/generate';
import { ProjectCard, type ProjectCardData } from '@/components/project/project-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Compass, Sparkles, Flame, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';
import type { ProjectCategory, ProjectStage, RemoteMode } from '@/config/constants';
import { ensureSeeded, db } from '@/lib/db/store';

export const metadata = { title: 'Discover projects' };
export const dynamic = 'force-dynamic';

interface SearchParams {
  tab?: 'for-you' | 'new' | 'needs';
  q?: string;
  category?: ProjectCategory;
  stage?: ProjectStage;
  remote?: RemoteMode;
}

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  await ensureSeeded();
  const tab = (searchParams.tab ?? 'for-you') as 'for-you' | 'new' | 'needs';
  const q = searchParams.q ?? null;
  const user = await getCurrentUser();

  // Pre-compute all three feeds so tabs switch instantly.
  const [suggested, fresh, needs] = await Promise.all([
    suggestProjectsForCurrentUser(10).catch(() => []),
    listProjects({ query: q, limit: 30 }),
    listProjects({ needsTeammates: true, query: q, limit: 30 }),
  ]);

  // For "For you" we already have full project rows; build cards with owner
  const ownerIds = Array.from(new Set(suggested.map((p) => p.owner_id)));
  const owners = (db.profiles.all() as any).filter((o) => ownerIds.includes(o.id));
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  const forYouCards: ProjectCardData[] = suggested.map((p) => {
    const owner = ownerMap.get(p.owner_id);
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
        displayName: owner?.display_name ?? 'Builder',
        username: owner?.username ?? 'unknown',
        avatarUrl: owner?.avatar_url ?? null,
      },
      memberCount: 1,
      openRoleCount: 0,
      openRoleTitles: [],
      lookingFor: [],
      tags: p.tags ?? [],
    };
  });

  return (
    <div className="container-wide py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Project-first. See what&apos;s being built, who&apos;s building it, and where you can help.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">Start a project</Link>
        </Button>
      </header>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="for-you" asChild>
            <Link href="/discover?tab=for-you">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> For you
            </Link>
          </TabsTrigger>
          <TabsTrigger value="new" asChild>
            <Link href="/discover?tab=new">
              <Flame className="mr-1.5 h-3.5 w-3.5" /> New
            </Link>
          </TabsTrigger>
          <TabsTrigger value="needs" asChild>
            <Link href="/discover?tab=needs">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Needs teammates
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="for-you">
          <ProjectGrid
            projects={forYouCards}
            emptyTitle={user ? 'No suggestions yet' : 'Log in to see personal suggestions'}
            emptyDescription={
              user
                ? 'Add skills to your profile and open a project role to get better recommendations.'
                : 'Sign in to get project suggestions based on your skills and interests.'
            }
            emptyAction={
              user ? (
                <Button asChild variant="outline">
                  <Link href="/settings">Edit profile</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/login">Log in</Link>
                </Button>
              )
            }
          />
        </TabsContent>
        <TabsContent value="new">
          <ProjectGrid projects={fresh} />
        </TabsContent>
        <TabsContent value="needs">
          <ProjectGrid
            projects={needs}
            emptyTitle="No teams looking right now"
            emptyDescription="Check back later or be the first to start a project."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectGrid({
  projects,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  projects: ProjectCardData[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? 'No projects yet'}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} data={p} />
      ))}
    </div>
  );
}
