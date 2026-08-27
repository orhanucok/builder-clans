import Link from 'next/link';
import { Search, Users, FolderKanban } from 'lucide-react';
import { ensureSeeded, db } from '@/lib/db/store';
import { getProfileSkills } from '@/lib/db/store/queries';
import { listProjects } from '@/lib/db/queries/projects';
import { ProjectCard, type ProjectCardData } from '@/components/project/project-card';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  USER_TYPE_LABELS, type UserType,
} from '@/config/constants';

export const metadata = { title: 'Search' };
export const dynamic = 'force-dynamic';

interface PersonHit {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  userType: string | null;
  skills: string[];
  builderLevel: number;
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  await ensureSeeded();
  const q = (searchParams.q ?? '').trim().toLowerCase();

  // People
  const allProfiles = (db.profiles.all() as any[]).filter((p) => p.onboarding_completed);
  const peopleHits: PersonHit[] = !q
    ? []
    : allProfiles
        .map((p) => {
          const skills = getProfileSkills(p.id);
          const blob = `${p.display_name} ${p.username} ${p.headline ?? ''} ${skills.join(' ')} ${p.location ?? ''} ${p.institution ?? ''}`.toLowerCase();
          const score = blob.includes(q) ? 1 : 0;
          return { profile: p, skills, score };
        })
        .filter((x) => x.score > 0)
        .slice(0, 12)
        .map(({ profile, skills }) => ({
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          headline: profile.headline,
          userType: profile.user_type,
          skills,
          builderLevel: profile.builder_level ?? 1,
        }));

  // Projects
  const projects = q
    ? await listProjects({ query: q, limit: 12 })
    : [];

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Search className="h-5 w-5" /> Search
        </h1>
        <form action="/search" method="GET" className="mt-4 flex gap-2">
          <Input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Projects, people, skills…"
            className="flex-1"
            autoFocus
          />
          <Button type="submit">Search</Button>
        </form>
      </header>

      {!q ? (
        <EmptyState
          title="Search Builder Clans"
          description="Find projects, open roles, and builders by name, skill, or location."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {peopleHits.length} builder{peopleHits.length === 1 ? '' : 's'} · {projects.length} project{projects.length === 1 ? '' : 's'} match &ldquo;{q}&rdquo;
          </p>

          {peopleHits.length === 0 && projects.length === 0 ? (
            <EmptyState
              title="No results"
              description="Try a different query — like a skill name, city, or a project keyword."
            />
          ) : null}

          {peopleHits.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-4 w-4" /> Builders ({peopleHits.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {peopleHits.map((p) => (
                  <Card key={p.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-3">
                      <Link href={`/people/${p.username}`} className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {p.avatarUrl ? <AvatarImage src={p.avatarUrl} /> : null}
                          <AvatarFallback name={p.displayName} />
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{p.displayName}</span>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">L{p.builderLevel}</span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                          {p.headline ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">{p.headline}</p>
                          ) : null}
                          {p.skills.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {p.skills.slice(0, 3).map((s) => (
                                <Badge key={s} variant="muted" className="text-[10px]">{s}</Badge>
                              ))}
                              {p.skills.length > 3 ? (
                                <span className="text-[10px] text-muted-foreground">+{p.skills.length - 3}</span>
                              ) : null}
                            </div>
                          ) : null}
                          {p.userType ? (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {USER_TYPE_LABELS[p.userType as UserType] ?? p.userType}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {projects.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <FolderKanban className="h-4 w-4" /> Projects ({projects.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} data={p} showSaveButton={true} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
