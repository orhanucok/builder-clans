import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, GraduationCap, Star } from 'lucide-react';
import { ensureSeeded, db } from '@/lib/db/store';
import { getProfileSkills, getProfileInterests } from '@/lib/db/store/queries';
import { getCurrentUser } from '@/lib/auth/session';
import { Markdown } from '@/components/ui/markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { levelProgress, publicReputationLabel } from '@/config/gamification';
import {
  USER_TYPE_LABELS,
  WEEKLY_HOURS_LABELS,
  REMOTE_MODE_LABELS,
  type UserType,
  type WeeklyHoursBucket,
  type RemoteMode,
  type ProjectStage,
  type ProjectCategory,
} from '@/config/constants';
import { ProjectCard, type ProjectCardData } from '@/components/project/project-card';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { username: string } }) {
  return { title: `@${params.username}` };
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  await ensureSeeded();
  const me = await getCurrentUser();
  const profile = db.profiles.findOne((p) => p.username === params.username);
  if (!profile) notFound();
  const isMe = Boolean(me && me.id === profile.id);

  const skills = getProfileSkills(profile.id);
  const interests = getProfileInterests(profile.id);
  const ownedRaw = db.projects.list({ ownerId: profile.id, limit: 20 });
  const memberProjects = db.project_members.list({ user_id: profile.id, status: 'ACTIVE' });
  const memberProjectIds = memberProjects.map((m) => m.project_id);
  const contributedRaw = memberProjectIds.length
    ? db.projects.all().filter((p) => memberProjectIds.includes(p.id) && p.owner_id !== profile.id).slice(0, 20)
    : [];

  const ownedDecorated = decorateProjects(ownedRaw, profile.display_name, profile.username, profile.avatar_url);
  const contributedDecorated = decorateProjects(contributedRaw, profile.display_name, profile.username, profile.avatar_url);

  const contribs = db.contributions.list((c) => (c as { user_id: string }).user_id === profile.id)
    .slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);

  const xp = profile.builder_xp ?? 0;
  const level = levelProgress(xp);
  const reputation = profile.reputation_score ?? 50;

  return (
    <div className="container-wide py-8">
      <header className="mb-8 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <Avatar className="h-20 w-20">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
          <AvatarFallback name={profile.display_name} />
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{profile.display_name}</h1>
            {isMe ? (
              <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                You
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.headline ? (
            <p className="mt-1 text-pretty text-sm text-foreground/80">{profile.headline}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {profile.user_type ? <Badge variant="muted">{USER_TYPE_LABELS[profile.user_type as UserType]}</Badge> : null}
            {profile.institution ? (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> {profile.institution}
              </span>
            ) : null}
            {profile.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location}
              </span>
            ) : null}
            {profile.weekly_hours ? (
              <span>{WEEKLY_HOURS_LABELS[profile.weekly_hours as WeeklyHoursBucket]}</span>
            ) : null}
            {profile.remote_preference ? (
              <span>{REMOTE_MODE_LABELS[profile.remote_preference as RemoteMode]}</span>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Stat label="Level" value={`L${level.current}`} />
          <Stat label="Reputation" value={String(reputation)} />
          <Stat label="XP" value={xp.toLocaleString()} />
        </div>
      </header>

      {isMe ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 p-3 text-sm">
          <span className="font-medium">This is your profile.</span>
          <Link
            href="/settings"
            className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
          >
            Edit profile
          </Link>
          <button
            type="button"
            onClick={undefined}
            data-share-url={`/people/${profile.username}`}
            className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
          >
            Copy link
          </button>
          <span className="text-xs text-muted-foreground">Public link: <code>/people/{profile.username}</code></span>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Builder Level</span>
              <span>L{level.current} → L{level.nextLevel}</span>
            </div>
            <Progress value={Math.round(level.progress * 100)} tone="xp" className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {level.xpToNext.toLocaleString()} XP to next level
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Reputation</span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-reputation" /> {publicReputationLabel(reputation)}
              </span>
            </div>
            <Progress value={reputation} tone="rep" className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              Built from trials, peer reviews, and shipped projects.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Activity</span>
              <span>last 30 days</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {ownedDecorated.length + contributedDecorated.length}
            </p>
            <p className="text-xs text-muted-foreground">active projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="built">
            <TabsList>
              <TabsTrigger value="built">Built ({ownedDecorated.length})</TabsTrigger>
              <TabsTrigger value="contributing">Contributing ({contributedDecorated.length})</TabsTrigger>
              <TabsTrigger value="contributions">Contributions ({contribs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="built">
              {ownedDecorated.length === 0 ? (
                <Empty title="No projects yet" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {ownedDecorated.map((p) => (
                    <ProjectCard key={p.id} data={p} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="contributing">
              {contributedDecorated.length === 0 ? (
                <Empty title="Not contributing to any project yet" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {contributedDecorated.map((p) => (
                    <ProjectCard key={p.id} data={p} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="contributions">
              {contribs.length === 0 ? (
                <Empty title="No contributions yet" description="Contributions are recorded on project tasks, artifacts, and trials." />
              ) : (
                <div className="space-y-2">
                  {contribs.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="space-y-1 p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="muted">{c.type}</Badge>
                          <span className="text-xs text-muted-foreground">{formatRelative(c.created_at)}</span>
                        </div>
                        <p className="text-sm">{c.description}</p>
                        {c.evidence_url ? (
                          <Link href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground hover:underline">
                            Evidence →
                          </Link>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No skills listed.</span>
                ) : (
                  skills.map((s) => (
                    <Badge key={s} variant="muted">{s}</Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Looking to build</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {interests.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No interests listed.</span>
                ) : (
                  interests.map((s) => (
                    <Badge key={s} variant="trial">{s}</Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="mt-1 text-xs">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

function decorateProjects(
  list: ReturnType<typeof db.projects.all>,
  ownerName: string,
  ownerUsername: string,
  ownerAvatar: string | null,
): ProjectCardData[] {
  if (list.length === 0) return [];
  const ids = new Set(list.map((p) => p.id));
  const members = db.project_members.all().filter((m) => ids.has(m.project_id) && m.status === 'ACTIVE');
  const memberCount = new Map<string, number>();
  for (const m of members) {
    memberCount.set(m.project_id, (memberCount.get(m.project_id) ?? 0) + 1);
  }
  const roles = db.project_roles.all().filter((r) => ids.has(r.project_id) && r.status === 'OPEN');
  const roleMap = new Map<string, string[]>();
  for (const r of roles) {
    const arr = roleMap.get(r.project_id) ?? [];
    arr.push(r.title);
    roleMap.set(r.project_id, arr);
  }
  return list.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.short_description,
    category: p.category as ProjectCategory,
    stage: p.stage as ProjectStage,
    remoteMode: p.remote_mode as RemoteMode,
    location: p.location,
    weeklyCommitmentMin: p.weekly_commitment_min,
    weeklyCommitmentMax: p.weekly_commitment_max,
    owner: { displayName: ownerName, username: ownerUsername, avatarUrl: ownerAvatar },
    memberCount: (memberCount.get(p.id) ?? 0) + 1,
    openRoleCount: roleMap.get(p.id)?.length ?? 0,
    openRoleTitles: roleMap.get(p.id) ?? [],
    lookingFor: roleMap.get(p.id) ?? [],
    tags: p.tags ?? [],
  }));
}
