import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveTrialPermissions } from '@/lib/permissions/checks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrialTabs } from './trial-tabs';
import { TrialReviewPanel } from './trial-review-panel';
import { TrialCompletePanel } from './trial-complete-panel';
import { formatRelative } from '@/lib/utils';
import type { TrialStatus } from '@/config/constants';

export const metadata = { title: 'Trial' };

export default async function TrialPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-10 text-sm text-muted-foreground">
        Configure Supabase to view this trial.
      </div>
    );
  }
  const user = await getCurrentUser();
  if (!user) notFound();
  const supabase = await createServerSupabase();
  const { data: trial } = await supabase
    .from('trials')
    .select('id, project_id, owner_id, status, goal, deliverables, duration_days, starts_at, ends_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!trial) notFound();
  const perms = await resolveTrialPermissions(supabase, { userId: user.id }, trial.id);
  if (!perms.canView) notFound();

  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, title')
    .eq('id', trial.project_id)
    .single();

  const { data: members } = await supabase
    .from('trial_members')
    .select('user_id, role, status, joined_at')
    .eq('trial_id', trial.id)
    .eq('status', 'ACTIVE');
  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, headline')
        .in('id', memberIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, assignee_id, due_date, created_at')
    .eq('trial_id', trial.id)
    .order('created_at', { ascending: true });

  // Channel for chat
  const { data: channel } = await supabase
    .from('channels')
    .select('id')
    .eq('trial_id', trial.id)
    .maybeSingle();

  return (
    <div className="container-wide py-8">
      <header className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="trial">Trial · {trial.status as TrialStatus}</Badge>
            <span>· {trial.duration_days}-day sprint</span>
            <span>· started {formatRelative(trial.starts_at as string)}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            <Link href={`/projects/${project?.slug}`} className="hover:underline">
              {project?.title ?? 'Trial'}
            </Link>
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{trial.goal}</p>
        </div>
        <div className="flex -space-x-2">
          {(members ?? []).map((m) => {
            const p = profileMap.get(m.user_id as string);
            return (
              <Avatar key={m.user_id} className="h-9 w-9 border-2 border-background">
                {p?.avatar_url ? <AvatarImage src={p.avatar_url} /> : null}
                <AvatarFallback name={p?.display_name ?? '?'} />
              </Avatar>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrialTabs
            trialId={trial.id}
            projectId={trial.project_id as string}
            channelId={channel?.id ?? null}
            currentUserId={user.id}
            canPost={perms.canSendMessage}
            canCreateTask={perms.canCreateTasks}
            tasks={(tasks ?? []).map((t) => ({
              ...t,
              assignee_id: (t.assignee_id as string | null) ?? null,
              description: (t.description as string | null) ?? null,
              due_date: (t.due_date as string | null) ?? null,
            }))}
            members={(members ?? []).map((m) => ({
              user_id: m.user_id as string,
              role: m.role as 'OWNER' | 'COLLABORATOR',
              display_name: profileMap.get(m.user_id as string)?.display_name ?? 'Unknown',
              username: profileMap.get(m.user_id as string)?.username ?? 'unknown',
              avatar_url: profileMap.get(m.user_id as string)?.avatar_url ?? null,
            }))}
          />
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deliverables</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {(trial.deliverables as string[]).map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-trial" />
                    {d}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {trial.status === 'ACTIVE' && perms.canComplete ? (
            <TrialCompletePanel trialId={trial.id} />
          ) : null}
          {(trial.status === 'COMPLETED' || trial.status === 'SUCCESSFUL' || trial.status === 'ENDED') ? (
            <TrialReviewPanel
              trialId={trial.id}
              reviewerId={user.id}
              reviewees={(members ?? [])
                .filter((m) => m.user_id !== user.id)
                .map((m) => ({
                  user_id: m.user_id as string,
                  display_name: profileMap.get(m.user_id as string)?.display_name ?? 'Unknown',
                  username: profileMap.get(m.user_id as string)?.username ?? 'unknown',
                }))}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
