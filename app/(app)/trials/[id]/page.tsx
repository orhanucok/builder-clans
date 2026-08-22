import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ensureSeeded, db } from '@/lib/db/store';
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
export const dynamic = 'force-dynamic';

export default async function TrialPage({ params }: { params: { id: string } }) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) notFound();
  const trial = db.trials.get(params.id);
  if (!trial) notFound();
  const perms = await resolveTrialPermissions(null, { userId: user.id }, trial.id);
  if (!perms.canView) notFound();

  const project = db.projects.get(trial.project_id);
  const members = db.trial_members.list({ trial_id: trial.id, status: 'ACTIVE' });
  const memberIds = members.map((m) => m.user_id);
  const profiles = memberIds.length
    ? db.profiles.all().filter((p) => memberIds.includes(p.id))
    : [];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const tasks = db.tasks.list({ trial_id: trial.id }).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const channel = db.channels.findOne((c) => (c as { trial_id: string | null }).trial_id === trial.id);

  return (
    <div className="container-wide py-8">
      <header className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="trial">Trial · {trial.status as TrialStatus}</Badge>
            <span>· {trial.duration_days}-day sprint</span>
            <span>· started {formatRelative(trial.starts_at)}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            <Link href={`/projects/${project?.slug}`} className="hover:underline">
              {project?.title ?? 'Trial'}
            </Link>
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{trial.goal}</p>
        </div>
        <div className="flex -space-x-2">
          {members.map((m) => {
            const p = profileMap.get(m.user_id);
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
            projectId={trial.project_id}
            channelId={channel?.id ?? null}
            currentUserId={user.id}
            canPost={perms.canSendMessage}
            canCreateTask={perms.canCreateTasks}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description ?? null,
              status: t.status,
              priority: t.priority,
              assignee_id: t.assignee_id ?? null,
              due_date: t.due_date ?? null,
              created_at: t.created_at,
            }))}
            members={members.map((m) => {
              const p = profileMap.get(m.user_id);
              return {
                user_id: m.user_id,
                role: m.role as 'OWNER' | 'COLLABORATOR',
                display_name: p?.display_name ?? 'Unknown',
                username: p?.username ?? 'unknown',
                avatar_url: p?.avatar_url ?? null,
              };
            })}
          />
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deliverables</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {trial.deliverables.map((d, i) => (
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
              reviewees={members
                .filter((m) => m.user_id !== user.id)
                .map((m) => {
                  const p = profileMap.get(m.user_id);
                  return {
                    user_id: m.user_id,
                    display_name: p?.display_name ?? 'Unknown',
                    username: p?.username ?? 'unknown',
                  };
                })}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
