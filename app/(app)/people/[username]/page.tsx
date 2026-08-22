import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, GraduationCap, Star } from 'lucide-react';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  levelProgress,
  publicReputationLabel,
} from '@/config/gamification';
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

export async function generateMetadata({ params }: { params: { username: string } }) {
  return { title: `@${params.username}` };
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-10 text-sm text-muted-foreground">
        Configure Supabase to view profiles.
      </div>
    );
  }
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .maybeSingle();
  if (!profile) notFound();

  // Skills, interests
  const [{ data: skills }, { data: interests }, { data: ownedProjects }, { data: memberProjects }] =
    await Promise.all([
      supabase.from('profile_skills').select('skill').eq('profile_id', profile.id),
      supabase.from('profile_interests').select('interest').eq('profile_id', profile.id),
      supabase
        .from('projects')
        .select(
          'id, slug, title, short_description, category, stage, remote_mode, location, weekly_commitment_min, weekly_commitment_max, tags, status, created_at, owner_id',
        )
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_members')
        .select('project_id, status')
        .eq('user_id', profile.id)
        .eq('status', 'ACTIVE'),
    ]);

  // Project list decorated (for owned projects)
  const ownedDecorated: ProjectCardData[] = await decorateProjects(
    supabase,
    (ownedProjects ?? []) as never,
    profile.display_name as string,
    profile.username as string,
    profile.avatar_url as string | null,
  );

  // Contributed projects
  const memberProjectIds = (memberProjects ?? []).map((m) => m.project_id as string);
  const { data: contributedRaw } = memberProjectIds.length
    ? await supabase
        .from('projects')
        .select(
          'id, slug, title, short_description, category, stage, remote_mode, location, weekly_commitment_min, weekly_commitment_max, tags, status, created_at, owner_id',
        )
        .in('id', memberProjectIds)
        .neq('owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] };
  const contributedDecorated: ProjectCardData[] = await decorateProjects(
    supabase,
    (contributedRaw ?? []) as never,
    profile.display_name as string,
    profile.username as string,
    profile.avatar_url as string | null,
  );

  // Verified contributions
  const { data: contribs } = await supabase
    .from('contributions')
    .select('id, project_id, type, description, evidence_url, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const xp = profile.builder_xp ?? 0;
  const level = levelProgress(xp);
  const reputation = profile.reputation_score ?? 50;

  return (
    <div className="container-wide py-8">
      <header className="mb-8 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <Avatar className="h-20 w-20">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
          <AvatarFallback name={profile.display_name as string} />
        </Avatar>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{profile.display_name as string}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username as string}</p>
          {profile.headline ? (
            <p className="mt-1 text-pretty text-sm text-foreground/80">{profile.headline as string}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {profile.user_type ? <Badge variant="muted">{USER_TYPE_LABELS[profile.user_type as UserType]}</Badge> : null}
            {profile.institution ? (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> {profile.institution as string}
              </span>
            ) : null}
            {profile.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location as string}
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

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Builder Level</span>
              <span>
                L{level.current} → L{level.nextLevel}
              </span>
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
              <TabsTrigger value="contributions">Contributions ({(contribs ?? []).length})</TabsTrigger>
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
              {(contribs ?? []).length === 0 ? (
                <Empty title="No contributions yet" description="Contributions are recorded on project tasks, artifacts, and trials." />
              ) : (
                <div className="space-y-2">
                  {(contribs ?? []).map((c) => (
                    <Card key={c.id}>
                      <CardContent className="space-y-1 p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="muted">{c.type as string}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelative(c.created_at as string)}
                          </span>
                        </div>
                        <p className="text-sm">{c.description as string}</p>
                        {c.evidence_url ? (
                          <Link
                            href={c.evidence_url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-foreground hover:underline"
                          >
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
                {(skills ?? []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No skills listed.</span>
                ) : (
                  (skills ?? []).map((s) => (
                    <Badge key={s.skill as string} variant="muted">
                      {s.skill as string}
                    </Badge>
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
                {(interests ?? []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No interests listed.</span>
                ) : (
                  (interests ?? []).map((s) => (
                    <Badge key={s.interest as string} variant="trial">
                      {s.interest as string}
                    </Badge>
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

async function decorateProjects(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  list: Array<{
    id: string;
    slug: string;
    title: string;
    short_description: string;
    category: string;
    stage: string;
    remote_mode: string;
    location: string | null;
    weekly_commitment_min: number;
    weekly_commitment_max: number;
    tags: string[] | null;
    status: string;
    created_at: string;
    owner_id: string;
  }>,
  ownerName: string,
  ownerUsername: string,
  ownerAvatar: string | null,
): Promise<ProjectCardData[]> {
  if (list.length === 0) return [];
  const ids = list.map((p) => p.id);
  const [{ data: members }, { data: roles }] = await Promise.all([
    supabase.from('project_members').select('project_id').in('project_id', ids).eq('status', 'ACTIVE'),
    supabase.from('project_roles').select('project_id, title, status').in('project_id', ids).eq('status', 'OPEN'),
  ]);
  const memberCount = new Map<string, number>();
  for (const m of members ?? []) {
    memberCount.set(m.project_id as string, (memberCount.get(m.project_id as string) ?? 0) + 1);
  }
  const roleMap = new Map<string, string[]>();
  for (const r of roles ?? []) {
    const arr = roleMap.get(r.project_id as string) ?? [];
    arr.push(r.title as string);
    roleMap.set(r.project_id as string, arr);
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
