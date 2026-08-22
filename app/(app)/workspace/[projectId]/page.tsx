import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ensureSeeded, db } from '@/lib/db/store';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectPermissions } from '@/lib/permissions/checks';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { OverviewTab } from './tabs/overview-tab';
import { TasksTab } from './tabs/tasks-tab';
import { UpdatesTab } from './tabs/updates-tab';
import { ArtifactsTab } from './tabs/artifacts-tab';
import { MembersTab } from './tabs/members-tab';
import { ChatTab } from './tabs/chat-tab';
import { AiTab } from './tabs/ai-tab';
import { SettingsTab } from './tabs/settings-tab';
import { PROJECT_STAGE_LABELS, type ProjectStage } from '@/config/constants';

export const metadata = { title: 'Project workspace' };
export const dynamic = 'force-dynamic';

export default async function WorkspacePage({
  params,
}: {
  params: { projectId: string };
}) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const project = db.projects.get(params.projectId);
  if (!project) notFound();
  const perms = await resolveProjectPermissions(null, { userId: user.id }, project.id);
  if (!perms.canView) notFound();

  const members = db.project_members.list({ project_id: project.id, status: 'ACTIVE' });
  const memberIds = members.map((m) => m.user_id);
  const profiles = memberIds.length
    ? db.profiles.all().filter((p) => memberIds.includes(p.id))
    : [];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const allTasks = db.tasks.list((t) => (t as { project_id: string | null }).project_id === project.id);
  const tasks = allTasks.filter((t) => !t.trial_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const milestones = db.milestones.list({ project_id: project.id }).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const updates = db.project_updates.list({ project_id: project.id })
    .slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);
  const artifacts = db.artifacts.list({ project_id: project.id })
    .slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const channel = db.channels.findOne((c) => (c as { project_id: string | null }).project_id === project.id);

  const taskTotal = tasks.length;
  const taskDone = tasks.filter((t) => t.status === 'DONE').length;
  const progressPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  const ownerProfile = profileMap.get(project.owner_id);
  const owner = {
    user_id: project.owner_id,
    member_type: 'OWNER' as const,
    display_name: ownerProfile?.display_name ?? 'Owner',
    username: ownerProfile?.username ?? 'unknown',
    avatar_url: ownerProfile?.avatar_url ?? null,
    builder_level: ownerProfile?.builder_level ?? 1,
    builder_xp: ownerProfile?.builder_xp ?? 0,
    reputation: ownerProfile?.reputation_score ?? 50,
    joined_at: project.created_at,
  };

  return (
    <div className="container-wide py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href={`/projects/${project.slug}`} className="hover:underline">
              {project.title}
            </Link>
            <span>·</span>
            <Badge variant="outline">{PROJECT_STAGE_LABELS[project.stage as ProjectStage]}</Badge>
            <span>·</span>
            <span>workspace</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={progressPct} className="h-1.5 w-32" tone="ship" />
          <span className="tabular-nums">{taskDone}/{taskTotal} tasks</span>
        </div>
      </header>

      <Separator className="mb-4" />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({taskTotal})</TabsTrigger>
          <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length + 1})</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts ({artifacts.length})</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          {perms.canEdit ? <TabsTrigger value="settings">Settings</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab
            project={project}
            members={[owner, ...members.map((m) => {
              const p = profileMap.get(m.user_id);
              return {
                user_id: m.user_id,
                member_type: m.member_type as 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR',
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
                builder_level: p?.builder_level ?? 1,
                builder_xp: p?.builder_xp ?? 0,
                reputation: p?.reputation_score ?? 50,
              };
            })].filter((m, i, arr) => arr.findIndex((x) => x.user_id === m.user_id) === i)}
            milestones={milestones.map((m) => ({
              id: m.id,
              title: m.title,
              status: m.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED',
              target_date: m.target_date,
            }))}
            progressPct={progressPct}
            taskDone={taskDone}
            taskTotal={taskTotal}
          />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab
            projectId={project.id}
            canCreate={perms.canEdit}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status as 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED',
              priority: t.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
              assignee_id: t.assignee_id,
              due_date: t.due_date,
            }))}
            members={members.map((m) => {
              const p = profileMap.get(m.user_id);
              return {
                user_id: m.user_id,
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
              };
            })}
            milestones={milestones.map((m) => ({
              id: m.id,
              title: m.title,
              status: m.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED',
            }))}
          />
        </TabsContent>
        <TabsContent value="updates">
          <UpdatesTab
            projectId={project.id}
            canPost={perms.canPostUpdates}
            updates={updates.map((u) => ({
              id: u.id,
              body: u.body,
              author_id: u.author_id,
              author_name: profileMap.get(u.author_id)?.display_name ?? 'Unknown',
              author_avatar: profileMap.get(u.author_id)?.avatar_url ?? null,
              created_at: u.created_at,
              visibility: u.visibility as 'TEAM' | 'PUBLIC',
            }))}
          />
        </TabsContent>
        <TabsContent value="chat">
          <ChatTab
            projectId={project.id}
            channelId={channel?.id ?? null}
            currentUserId={user.id}
            canPost={perms.canView}
            members={members.map((m) => {
              const p = profileMap.get(m.user_id);
              return {
                user_id: m.user_id,
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
              };
            })}
          />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab
            owner={owner}
            members={members.map((m) => {
              const p = profileMap.get(m.user_id);
              return {
                user_id: m.user_id,
                member_type: m.member_type as 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR',
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
                builder_level: p?.builder_level ?? 1,
                builder_xp: p?.builder_xp ?? 0,
                reputation: p?.reputation_score ?? 50,
                joined_at: m.joined_at,
              };
            })}
          />
        </TabsContent>
        <TabsContent value="artifacts">
          <ArtifactsTab
            projectId={project.id}
            canCreate={perms.canCreateArtifacts}
            artifacts={artifacts.map((a) => ({
              id: a.id,
              title: a.title,
              type: a.type as never,
              url: a.url,
              description: a.description,
              creator_id: a.creator_id,
              created_at: a.created_at,
            }))}
          />
        </TabsContent>
        <TabsContent value="ai">
          <AiTab projectId={project.id} projectTitle={project.title} />
        </TabsContent>
        {perms.canEdit ? (
          <TabsContent value="settings">
            <SettingsTab project={project} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
