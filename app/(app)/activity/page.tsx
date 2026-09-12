import Link from 'next/link';
import {
  Sparkles, Hammer, Rocket, UserPlus, FileEdit, Trophy, Plus, MessageSquare,
} from 'lucide-react';
import { ensureSeeded, db } from '@/lib/db/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelative } from '@/lib/utils';

export const metadata = { title: 'Activity' };

type ActivityItem = {
  id: string;
  kind: 'project_created' | 'application' | 'match' | 'trial_started' | 'trial_completed' | 'contribution' | 'ship';
  at: string;
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string | null;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  extra?: string;
};

export default async function ActivityPage() {
  await ensureSeeded();

  const items: ActivityItem[] = [];

  // New projects
  const projects = (db.projects.all() as any[]).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const p of projects) {
    const owner = db.profiles.get(p.owner_id);
    items.push({
      id: `proj-${p.id}`,
      kind: 'project_created',
      at: p.created_at,
      actorId: p.owner_id,
      actorName: owner?.display_name ?? 'Unknown',
      actorUsername: owner?.username ?? 'unknown',
      actorAvatar: owner?.avatar_url ?? null,
      projectId: p.id,
      projectSlug: p.slug,
      projectTitle: p.title,
    });
  }

  // Applications
  for (const a of db.applications.all()) {
    const app = a as { id: string; applicant_id: string; project_id: string; status: string; created_at: string };
    const actor = db.profiles.get(app.applicant_id);
    const project = db.projects.get(app.project_id);
    if (!actor || !project) continue;
    items.push({
      id: `app-${app.id}`,
      kind: app.status === 'ACCEPTED' ? 'match' : 'application',
      at: app.created_at,
      actorId: app.applicant_id,
      actorName: actor.display_name,
      actorUsername: actor.username,
      actorAvatar: actor.avatar_url,
      projectId: app.project_id,
      projectSlug: project.slug,
      projectTitle: project.title,
    });
  }

  // Trials
  for (const t of db.trials.all()) {
    const trial = t as { id: string; owner_id: string; project_id: string; status: string; created_at: string; goal: string };
    const owner = db.profiles.get(trial.owner_id);
    const project = db.projects.get(trial.project_id);
    if (!owner || !project) continue;
    items.push({
      id: `trl-${trial.id}`,
      kind: trial.status === 'SUCCESSFUL' || trial.status === 'COMPLETED' ? 'trial_completed' : 'trial_started',
      at: trial.created_at,
      actorId: trial.owner_id,
      actorName: owner.display_name,
      actorUsername: owner.username,
      actorAvatar: owner.avatar_url,
      projectId: trial.project_id,
      projectSlug: project.slug,
      projectTitle: project.title,
      extra: trial.goal,
    });
  }

  // Ship events: project status = COMPLETED
  for (const p of projects) {
    if (p.status === 'COMPLETED') {
      const owner = db.profiles.get(p.owner_id);
      items.push({
        id: `ship-${p.id}`,
        kind: 'ship',
        at: p.updated_at,
        actorId: p.owner_id,
        actorName: owner?.display_name ?? 'Unknown',
        actorUsername: owner?.username ?? 'unknown',
        actorAvatar: owner?.avatar_url ?? null,
        projectId: p.id,
        projectSlug: p.slug,
        projectTitle: p.title,
      });
    }
  }

  // Contributions
  for (const c of db.contributions.all()) {
    const con = c as { id: string; user_id: string; project_id: string; description: string; created_at: string };
    const actor = db.profiles.get(con.user_id);
    const project = db.projects.get(con.project_id);
    if (!actor || !project) continue;
    items.push({
      id: `con-${con.id}`,
      kind: 'contribution',
      at: con.created_at,
      actorId: con.user_id,
      actorName: actor.display_name,
      actorUsername: actor.username,
      actorAvatar: actor.avatar_url,
      projectId: con.project_id,
      projectSlug: project.slug,
      projectTitle: project.title,
      extra: con.description,
    });
  }

  // Sort newest first, take top 60
  items.sort((a, b) => b.at.localeCompare(a.at));
  const top = items.slice(0, 60);

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What&apos;s happening across the network â€” new projects, applications, trials, and shipped work.
        </p>
      </header>

      {top.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="When people create projects, apply, and ship work, you'll see it here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ol className="divide-y divide-border/60">
              {top.map((it) => (
                <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                    <Avatar className="h-8 w-8">
                      {it.actorAvatar ? <AvatarImage src={it.actorAvatar} /> : null}
                      <AvatarFallback name={it.actorName} />
                    </Avatar>
                    <KindIcon kind={it.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <KindBadge kind={it.kind} />
                      <Link
                        href={`/people/${it.actorUsername}`}
                        className="font-medium hover:underline"
                      >
                        {it.actorName}
                      </Link>
                      <span className="text-muted-foreground">{verbFor(it.kind)}</span>
                      <Link
                        href={`/projects/${it.projectSlug}`}
                        className="truncate font-medium hover:underline"
                      >
                        {it.projectTitle}
                      </Link>
                    </div>
                    {it.extra ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.extra}</p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatRelative(it.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function verbFor(kind: ActivityItem['kind']): string {
  switch (kind) {
    case 'project_created': return 'started a new project';
    case 'application': return 'applied to';
    case 'match': return 'was accepted to';
    case 'trial_started': return 'started a Trial Sprint on';
    case 'trial_completed': return 'completed a trial on';
    case 'contribution': return 'contributed to';
    case 'ship': return 'shipped';
    default: return 'updated';
  }
}

function KindIcon({ kind }: { kind: ActivityItem['kind'] }) {
  const Icon =
    kind === 'project_created' ? Plus
    : kind === 'application' ? UserPlus
    : kind === 'match' ? Sparkles
    : kind === 'trial_started' ? Hammer
    : kind === 'trial_completed' ? Trophy
    : kind === 'contribution' ? FileEdit
    : kind === 'ship' ? Rocket
    : MessageSquare;
  const color =
    kind === 'ship' ? 'text-ship'
    : kind === 'trial_completed' ? 'text-xp'
    : kind === 'match' ? 'text-primary'
    : 'text-muted-foreground';
  return <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden />;
}

function KindBadge({ kind }: { kind: ActivityItem['kind'] }) {
  const label =
    kind === 'project_created' ? 'New project'
    : kind === 'application' ? 'Application'
    : kind === 'match' ? 'Match'
    : kind === 'trial_started' ? 'Trial started'
    : kind === 'trial_completed' ? 'Trial done'
    : kind === 'contribution' ? 'Contribution'
    : kind === 'ship' ? 'Shipped'
    : 'Update';
  const variant =
    kind === 'ship' ? 'success'
    : kind === 'trial_completed' ? 'success'
    : kind === 'match' ? 'default'
    : 'muted';
  return <Badge variant={variant as never} className="text-[10px]">{label}</Badge>;
}
