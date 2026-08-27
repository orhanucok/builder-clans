import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { ensureSeeded, db } from '@/lib/db/store';
import { Button } from '@/components/ui/button';
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

  // Compute trial countdown
  const trialStartMs = new Date(trial.starts_at).getTime();
  const trialEndMs = new Date(trial.ends_at).getTime();
  const nowMs = Date.now();
  const totalMs = Math.max(1, trialEndMs - trialStartMs);
  const elapsedMs = Math.max(0, Math.min(totalMs, nowMs - trialStartMs));
  const remainingMs = Math.max(0, trialEndMs - nowMs);
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const progressPct = Math.round((elapsedMs / totalMs) * 100);
  const isExpired = remainingMs <= 0;
  const isCompleted = trial.status !== 'ACTIVE';

  return (
    <div className="container-wide py-8">
      {(trial.status === 'SUCCESSFUL' || trial.status === 'COMPLETED') ? (
        <div className="mb-6 rounded-md border border-ship/30 bg-ship/5 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ship/15 text-ship">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-ship">Trial complete — this project just shipped work.</h2>
              <p className="mt-1 text-sm text-foreground/80">
                Both builders earned XP and a reputation boost. The team is now a permanent project member.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm">
                  <Link href={`/workspace/${trial.project_id}`}>Open project</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/projects/${project?.slug}`}>View project page</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/trials">See all trials</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : trial.status === 'ENDED' ? (
        <div className="mb-6 rounded-md border border-border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Trial ended without converting.</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                That&apos;s fine — not every match becomes a team. Keep building and try other matches.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <header className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
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
          {trial.status === 'ACTIVE' ? (
            <div className="mt-4 max-w-md rounded-md border border-border bg-card/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {isExpired ? 'Time up — wrap up' : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`}
                </span>
                <span className="tabular-nums text-muted-foreground">{progressPct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={isExpired ? 'h-full bg-destructive' : 'h-full bg-trial'}
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
            </div>
          ) : null}
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
