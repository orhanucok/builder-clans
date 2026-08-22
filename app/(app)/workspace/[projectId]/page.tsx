import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
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

export default async function WorkspacePage({
  params,
}: {
  params: { projectId: string };
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-10 text-sm text-muted-foreground">
        Configure Supabase to use the workspace.
      </div>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const supabase = await createServerSupabase();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .maybeSingle();
  if (!project) notFound();
  const perms = await resolveProjectPermissions(supabase, { userId: user.id }, project.id);
  if (!perms.canView) notFound();

  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, member_type, status, role_title, joined_at')
    .eq('project_id', project.id)
    .eq('status', 'ACTIVE');
  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, headline, builder_xp, builder_level, reputation_score')
        .in('id', memberIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const [{ data: tasks }, { data: milestones }, { data: updates }, { data: artifacts }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .is('trial_id', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('project_updates')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('artifacts')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false }),
    ]);

  const { data: channel } = await supabase
    .from('channels')
    .select('id')
    .eq('project_id', project.id)
    .eq('type', 'PROJECT')
    .maybeSingle();

  const taskTotal = tasks?.length ?? 0;
  const taskDone = (tasks ?? []).filter((t) => t.status === 'DONE').length;
  const progressPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  const ownerProfile = profileMap.get(project.owner_id as string);
  const owner = {
    user_id: project.owner_id as string,
    member_type: 'OWNER' as const,
    display_name: ownerProfile?.display_name ?? 'Owner',
    username: ownerProfile?.username ?? 'unknown',
    avatar_url: ownerProfile?.avatar_url ?? null,
    builder_level: ownerProfile?.builder_level ?? 1,
    builder_xp: ownerProfile?.builder_xp ?? 0,
    reputation: ownerProfile?.reputation_score ?? 50,
    joined_at: project.created_at as string,
  };

  return (
    <div className="container-wide py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href={`/projects/${project.slug}`} className="hover:underline">
              {project.title as string}
            </Link>
            <span>·</span>
            <Badge variant="outline">{PROJECT_STAGE_LABELS[project.stage as ProjectStage]}</Badge>
            <span>·</span>
            <span>workspace</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title as string}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={progressPct} className="h-1.5 w-32" tone="ship" />
          <span className="tabular-nums">
            {taskDone}/{taskTotal} tasks
          </span>
        </div>
      </header>

      <Separator className="mb-4" />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({taskTotal})</TabsTrigger>
          <TabsTrigger value="updates">Updates ({(updates ?? []).length})</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="members">Members ({(members?.length ?? 0) + 1})</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts ({(artifacts ?? []).length})</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          {perms.canEdit ? <TabsTrigger value="settings">Settings</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab
            project={project}
            members={[owner, ...(members ?? []).map((m) => {
              const p = profileMap.get(m.user_id as string);
              return {
                user_id: m.user_id as string,
                member_type: m.member_type as 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR',
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
                builder_level: p?.builder_level ?? 1,
                builder_xp: p?.builder_xp ?? 0,
                reputation: p?.reputation_score ?? 50,
              };
            })].filter((m, i, arr) => arr.findIndex((x) => x.user_id === m.user_id) === i)}
            milestones={(milestones ?? []).map((m) => ({
              id: m.id as string,
              title: m.title as string,
              status: m.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED',
              target_date: m.target_date as string | null,
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
            tasks={(tasks ?? []).map((t) => ({
              id: t.id as string,
              title: t.title as string,
              description: t.description as string | null,
              status: t.status as 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED',
              priority: t.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
              assignee_id: t.assignee_id as string | null,
              due_date: t.due_date as string | null,
            }))}
            members={(members ?? []).map((m) => {
              const p = profileMap.get(m.user_id as string);
              return {
                user_id: m.user_id as string,
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
              };
            })}
            milestones={(milestones ?? []).map((m) => ({
              id: m.id as string,
              title: m.title as string,
              status: m.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED',
            }))}
          />
        </TabsContent>
        <TabsContent value="updates">
          <UpdatesTab
            projectId={project.id}
            canPost={perms.canPostUpdates}
            updates={(updates ?? []).map((u) => ({
              id: u.id as string,
              body: u.body as string,
              author_id: u.author_id as string,
              author_name: profileMap.get(u.author_id as string)?.display_name ?? 'Unknown',
              author_avatar: profileMap.get(u.author_id as string)?.avatar_url ?? null,
              created_at: u.created_at as string,
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
            members={(members ?? []).map((m) => {
              const p = profileMap.get(m.user_id as string);
              return {
                user_id: m.user_id as string,
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
            members={(members ?? []).map((m) => {
              const p = profileMap.get(m.user_id as string);
              return {
                user_id: m.user_id as string,
                member_type: m.member_type as 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR',
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
                builder_level: p?.builder_level ?? 1,
                builder_xp: p?.builder_xp ?? 0,
                reputation: p?.reputation_score ?? 50,
                joined_at: m.joined_at as string,
              };
            })}
          />
        </TabsContent>
        <TabsContent value="artifacts">
          <ArtifactsTab
            projectId={project.id}
            canCreate={perms.canCreateArtifacts}
            artifacts={(artifacts ?? []).map((a) => ({
              id: a.id as string,
              title: a.title as string,
              type: a.type as never,
              url: a.url as string,
              description: a.description as string | null,
              creator_id: a.creator_id as string,
              created_at: a.created_at as string,
            }))}
          />
        </TabsContent>
        <TabsContent value="ai">
          <AiTab projectId={project.id} projectTitle={project.title as string} />
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
