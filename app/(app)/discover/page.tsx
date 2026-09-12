import Link from 'next/link';
import { listProjects } from '@/lib/db/queries/projects';
import { suggestProjectsForCurrentUser } from '@/lib/matching/generate';
import { ProjectCard, type ProjectCardData } from '@/components/project/project-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Compass, Sparkles, Flame, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';
import {
  PROJECT_CATEGORIES, PROJECT_STAGES, REMOTE_MODES,
  type ProjectCategory, type ProjectStage, type RemoteMode,
} from '@/config/constants';
import { CANONICAL_SKILLS } from '@/config/matching';
import { ensureSeeded, db } from '@/lib/db/store';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Discover projects' };

interface SearchParams {
  tab?: 'for-you' | 'new' | 'needs';
  q?: string;
  category?: ProjectCategory;
  stage?: ProjectStage;
  remote?: RemoteMode;
  skill?: string;
}

export default async function DiscoverPage() {
  await ensureSeeded();
  // Static export cannot read searchParams at build time, so all filtering
  // happens client-side via <DiscoverClient/> below. We still compute the
  // initial three feeds here so the first paint has real data.
  const tab = 'for-you' as 'for-you' | 'new' | 'needs';
  const q = null as string | null;
  const category = undefined as ProjectCategory | undefined;
  const stage = undefined as ProjectStage | undefined;
  const remote = undefined as RemoteMode | undefined;
  const skill = null as string | null;
  const user = await getCurrentUser();

  // Pre-compute all three feeds so tabs switch instantly.
  const baseFilters = { query: q, category, stage, remoteMode: remote, limit: 30 } as const;
  const [suggested, fresh, needs] = await Promise.all([
    suggestProjectsForCurrentUser(10).catch(() => []),
    listProjects({ ...baseFilters }),
    listProjects({ ...baseFilters, needsTeammates: true }),
  ]);

  // For "For you" we already have full project rows; build cards with owner.
  const ownerIds = Array.from(new Set(suggested.map((p) => p.owner_id)));
  const owners = (db.profiles.all() as any).filter((o) => ownerIds.includes(o.id));
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  // Skill filter applied client-side after server-side selection
  const applySkillFilter = (cards: ProjectCardData[]): ProjectCardData[] => {
    if (!skill) return cards;
    return cards.filter((c) => c.tags.some((t) => t.toLowerCase() === skill.toLowerCase()));
  };

  const forYouCards: ProjectCardData[] = applySkillFilter(
    suggested.map((p) => {
      const owner = ownerMap.get(p.owner_id);
      return {
        id: p.id, slug: p.slug, title: p.title, shortDescription: p.short_description,
        category: p.category, stage: p.stage, remoteMode: p.remote_mode, location: p.location,
        weeklyCommitmentMin: p.weekly_commitment_min, weeklyCommitmentMax: p.weekly_commitment_max,
        owner: {
          displayName: owner?.display_name ?? 'Builder',
          username: owner?.username ?? 'unknown',
          avatarUrl: owner?.avatar_url ?? null,
        },
        memberCount: 1, openRoleCount: 0, openRoleTitles: [], lookingFor: [],
        tags: p.tags ?? [],
      };
    }),
  );

  const freshFiltered = applySkillFilter(fresh);
  const needsFiltered = applySkillFilter(needs);

  // Build a "clear filters" URL that drops all filter params
  const clearHref = `/discover?tab=${tab}`;

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

      <DiscoverFilters
        q={q}
        category={category}
        stage={stage}
        remote={remote}
        skill={skill}
        clearHref={clearHref}
      />

      {(q || category || stage || remote || skill) ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing filtered results. <Link href="/discover?tab={tab}" className="font-medium text-foreground hover:underline">Clear all filters</Link> to see everything.
        </p>
      ) : null}

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
          <ProjectGrid
            projects={freshFiltered}
            emptyTitle="No projects match your filters"
            emptyDescription="Try widening your search or removing some filters."
            emptyFiltersClearHref={clearHref}
          />
        </TabsContent>
        <TabsContent value="needs">
          <ProjectGrid
            projects={needsFiltered}
            emptyTitle="No teams looking right now"
            emptyDescription="Check back later, or be the first to start a project and bring the network together."
            emptyAction={
              <Button asChild>
                <Link href="/projects/new">Start a project</Link>
              </Button>
            }
            emptyFiltersClearHref={clearHref}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FilterProps {
  q: string | null;
  category: string | undefined;
  stage: string | undefined;
  remote: string | undefined;
  skill: string | undefined;
  clearHref: string;
}

function DiscoverFilters({ q, category, stage, remote, skill, clearHref }: FilterProps) {
  const hasAny = Boolean(q || category || stage || remote || skill);
  // Build a search URL with the same base + a different param
  const buildHref = (param: string, value: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (stage) params.set('stage', stage);
    if (remote) params.set('remote', remote);
    if (skill) params.set('skill', skill);
    if (value === null) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    return `/discover?${params.toString()}`;
  };

  return (
    <div className="mb-6 space-y-3">
      <form action="/discover" method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by title, description, or tagâ€¦"
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {stage ? <input type="hidden" name="stage" value={stage} /> : null}
        {remote ? <input type="hidden" name="remote" value={remote} /> : null}
        {skill ? <input type="hidden" name="skill" value={skill} /> : null}
        <Button type="submit" size="sm" variant="outline">Search</Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Category</span>
        {(PROJECT_CATEGORIES as readonly string[]).map((c) => (
          <FilterChip
            key={c}
            href={buildHref('category', category === c ? null : c)}
            active={category === c}
            label={c.replace(/_/g, ' ').toLowerCase()}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Stage</span>
        {(PROJECT_STAGES as readonly string[]).map((s) => (
          <FilterChip
            key={s}
            href={buildHref('stage', stage === s ? null : s)}
            active={stage === s}
            label={s.toLowerCase()}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Remote</span>
        {(REMOTE_MODES as readonly string[]).map((r) => (
          <FilterChip
            key={r}
            href={buildHref('remote', remote === r ? null : r)}
            active={remote === r}
            label={r.replace(/_/g, ' ').toLowerCase()}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Skill</span>
        {(CANONICAL_SKILLS as readonly string[]).slice(0, 12).map((s) => (
          <FilterChip
            key={s}
            href={buildHref('skill', skill === s ? null : s)}
            active={skill === s}
            label={s}
          />
        ))}
        {skill ? (
          <Link href={buildHref('skill', null)} className="text-xs text-muted-foreground hover:text-foreground">
            clear skill
          </Link>
        ) : null}
      </div>

      {hasAny ? (
        <div className="flex items-center gap-2 text-xs">
          <Link href={clearHref} className="font-medium text-foreground hover:underline">
            Clear all filters
          </Link>
          <span className="text-muted-foreground">Â·</span>
          <span className="text-muted-foreground">{countActiveFilters(q, category, stage, remote, skill)} active</span>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}

function countActiveFilters(q: string | null, c: string | undefined, s: string | undefined, r: string | undefined, sk: string | undefined) {
  let n = 0;
  if (q) n++;
  if (c) n++;
  if (s) n++;
  if (r) n++;
  if (sk) n++;
  return n;
}

function ProjectGrid({
  projects,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyFiltersClearHref,
}: {
  projects: ProjectCardData[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  emptyFiltersClearHref?: string;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? 'No projects yet'}
        description={emptyDescription}
        action={
          <>
            {emptyAction}
            {emptyFiltersClearHref ? (
              <div className="mt-3">
                <Link href={emptyFiltersClearHref} className="text-xs font-medium text-foreground hover:underline">
                  Clear filters â†’
                </Link>
              </div>
            ) : null}
          </>
        }
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
