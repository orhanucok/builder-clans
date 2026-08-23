import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ExternalLink,
  Github,
  Globe,
  MapPin,
  Users,
  Plus,
  CheckCircle2,
  Sparkles,
  Rocket,
} from 'lucide-react';
import { ensureSeeded, db } from '@/lib/db/store';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectPermissions } from '@/lib/permissions/checks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Markdown } from '@/components/ui/markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_STAGE_LABELS,
  REMOTE_MODE_LABELS,
  type ProjectCategory,
  type ProjectStage,
  type RemoteMode,
} from '@/config/constants';
import { ApplyDialog } from './apply-dialog';
import { OpenRoleManager } from './open-role-manager';
import { ApplicationList } from './application-list';
import { MembersList } from './members-list';
import { ShipButton } from './ship-button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: params.slug };
}

export default async function ProjectPage({ params }: { params: { slug: string } }) {
  await ensureSeeded();
  const user = await getCurrentUser();
  const project = db.projects.findOne((p) => p.slug === params.slug);
  if (!project) notFound();

  const perms = user
    ? await resolveProjectPermissions(null, { userId: user.id }, project.id)
    : {
        canView: project.visibility === 'PUBLIC',
        canEdit: false, canManageMembers: false, canManageRoles: false, canDelete: false,
        canCreateArtifacts: false, canCreateMilestones: false, canPostUpdates: false, memberType: null,
      };
  if (!perms.canView) {
    redirect('/login?returnTo=' + encodeURIComponent(`/projects/${params.slug}`));
  }

  // Owner profile
  const owner = db.profiles.get(project.owner_id);

  // Project skills
  const skills = db.project_skills.list({ project_id: project.id }).map((r) => (r as { skill: string }).skill);

  // Open roles
  const roles = db.project_roles.list({ project_id: project.id });

  // Members
  const members = db.project_members.list({ project_id: project.id, status: 'ACTIVE' });
  const memberUserIds = members.map((m) => m.user_id);
  const memberProfiles = memberUserIds.length
    ? db.profiles.all().filter((p) => memberUserIds.includes(p.id))
    : [];

  // Applications (only owner)
  const applications = perms.canEdit
    ? db.applications.list((a) => (a as { project_id: string }).project_id === project.id)
    : [];
  const applicantIds = applications.map((a) => (a as { applicant_id: string }).applicant_id);
  const applicantProfiles = applicantIds.length
    ? db.profiles.all().filter((p) => applicantIds.includes(p.id))
    : [];

  // Current user's relationship
  const myMember = members.find((m) => m.user_id === user?.id);
  const isOwner = user?.id === project.owner_id;
  const canApply = Boolean(user && !isOwner && !myMember && project.status === 'ACTIVE');

  return (
    <div className="container-wide py-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="muted">{PROJECT_CATEGORY_LABELS[project.category as ProjectCategory]}</Badge>
            <Badge variant="outline">{PROJECT_STAGE_LABELS[project.stage as ProjectStage]}</Badge>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {REMOTE_MODE_LABELS[project.remote_mode as RemoteMode]}
              {project.location ? ` · ${project.location}` : null}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {members.length + 1} members
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{project.title}</h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            {project.short_description}
          </p>
          {owner ? (
            <div className="mt-4 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {owner.avatar_url ? <AvatarImage src={owner.avatar_url} /> : null}
                <AvatarFallback name={owner.display_name} />
              </Avatar>
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Led by{' '}
                  <Link href={`/people/${owner.username}`} className="font-medium text-foreground hover:underline">
                    {owner.display_name}
                  </Link>
                </p>
                {owner.headline ? <p className="text-xs text-muted-foreground">{owner.headline}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {canApply ? <ApplyDialog projectId={project.id} roleId={null} /> : null}
          {perms.canEdit && project.status !== 'COMPLETED' ? (
            <ShipButton projectId={project.id} />
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About this project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground/90">
                <Markdown source={project.description} />
              </div>
              {skills.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <Badge key={s} variant="muted">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Tabs defaultValue="roles">
            <TabsList>
              <TabsTrigger value="roles">Open roles ({roles.length})</TabsTrigger>
              <TabsTrigger value="members">Members ({members.length + 1})</TabsTrigger>
              {perms.canEdit ? (
                <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="roles">
              <div className="space-y-3">
                {roles.length === 0 ? (
                  <EmptyState
                    title="No open roles yet"
                    description="Add the first role to start finding collaborators."
                    {...(perms.canEdit
                      ? {
                          action: (
                            <OpenRoleManager projectId={project.id}>
                              <Button size="sm">
                                <Plus className="h-4 w-4" /> Add role
                              </Button>
                            </OpenRoleManager>
                          ),
                        }
                      : {})}
                  />
                ) : (
                  roles.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{r.title}</h3>
                            {r.description ? (
                              <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                            ) : null}
                          </div>
                          <Badge variant="trial">{r.status}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {r.commitment_min}-{r.commitment_max} h/week
                          </span>
                          <span>·</span>
                          <span>{r.experience_level}</span>
                        </div>
                        {Array.isArray(r.required_skills) && r.required_skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(r.required_skills as string[]).map((s) => (
                              <Badge key={s} variant="muted">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {canApply ? (
                          <ApplyDialog projectId={project.id} roleId={r.id}>
                            <Button size="sm" variant="outline">
                              <Sparkles className="h-3.5 w-3.5" /> Apply to this role
                            </Button>
                          </ApplyDialog>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))
                )}
                {perms.canEdit ? (
                  <div className="pt-2">
                    <OpenRoleManager projectId={project.id}>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" /> Add another role
                      </Button>
                    </OpenRoleManager>
                  </div>
                ) : null}
              </div>
            </TabsContent>
            <TabsContent value="members">
              <MembersList
                owner={
                  owner
                    ? {
                        id: owner.id,
                        username: owner.username,
                        display_name: owner.display_name,
                        avatar_url: owner.avatar_url,
                        headline: owner.headline,
                        reputation_score: owner.reputation_score,
                        builder_xp: owner.builder_xp,
                        builder_level: owner.builder_level,
                        member_type: 'OWNER',
                        role_title: null,
                        joined_at: project.created_at,
                      }
                    : null
                }
                members={memberProfiles.map((p) => {
                  const m = members.find((mm) => mm.user_id === p.id);
                  return {
                    id: p.id,
                    username: p.username,
                    display_name: p.display_name,
                    avatar_url: p.avatar_url,
                    headline: p.headline,
                    reputation_score: p.reputation_score,
                    builder_xp: p.builder_xp,
                    builder_level: p.builder_level,
                    member_type: m?.member_type ?? 'COLLABORATOR',
                    role_title: m?.role_title ?? null,
                    joined_at: m?.joined_at ?? null,
                  };
                })}
              />
            </TabsContent>
            {perms.canEdit ? (
              <TabsContent value="applications">
                <ApplicationList
                  applications={applications as never}
                  profiles={applicantProfiles.map((p) => ({
                    id: p.id, username: p.username, display_name: p.display_name,
                    avatar_url: p.avatar_url, headline: p.headline,
                  })) as never}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Commitment" value={`${project.weekly_commitment_min}-${project.weekly_commitment_max} h/week`} />
              <Row label="Mode" value={REMOTE_MODE_LABELS[project.remote_mode as RemoteMode]} />
              <Row label="Stage" value={PROJECT_STAGE_LABELS[project.stage as ProjectStage]} />
              {project.location ? <Row label="Location" value={project.location} /> : null}
              <Row label="Status" value={project.status} />
              <Row label="Created" value={formatRelative(project.created_at)} />
            </CardContent>
          </Card>

          {project.github_url || project.demo_url || project.website_url ? (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {project.github_url ? (
                  <Link
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-foreground hover:underline"
                  >
                    <Github className="h-4 w-4" /> Repository
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
                {project.demo_url ? (
                  <Link
                    href={project.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-foreground hover:underline"
                  >
                    <Rocket className="h-4 w-4" /> Live demo
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
                {project.website_url ? (
                  <Link
                    href={project.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-foreground hover:underline"
                  >
                    <Globe className="h-4 w-4" /> Website
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {project.status === 'COMPLETED' ? (
            <Card className="glow-ship">
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-ship" />
                <div>
                  <p className="text-sm font-semibold">Project shipped</p>
                  <p className="text-xs text-muted-foreground">The team earned reputation for this.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
