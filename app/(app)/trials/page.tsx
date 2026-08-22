import Link from 'next/link';
import { Hammer, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ensureSeeded, db } from '@/lib/db/store';
import { getCurrentUser } from '@/lib/auth/session';
import { formatRelative } from '@/lib/utils';
import type { TrialStatus } from '@/config/constants';

export const metadata = { title: 'Trials' };
export const dynamic = 'force-dynamic';

export default async function TrialsPage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          title="Log in to see your trials"
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
      </div>
    );
  }
  // trials where I'm a member
  const myMemberships = db.trial_members.list({ user_id: user.id });
  const ids = new Set(myMemberships.map((m) => (m as { trial_id: string }).trial_id));
  const trials = (db.trials.all() as any)
    .filter((t) => ids.has(t.id) || t.owner_id === user.id)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  if (trials.length === 0) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          icon={<Hammer className="h-10 w-10" />}
          title="No active trials"
          description="When a match becomes mutual, you can start a 7-day Trial Sprint to test how you work together."
          action={
            <Button asChild>
              <Link href="/matches">See matches</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const projectIds = Array.from(new Set(trials.map((t) => t.project_id)));
  const projects = (db.projects.all() as any).filter((p) => projectIds.includes(p.id));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test how you work together before you commit. A successful trial becomes a team.
        </p>
      </header>
      <div className="space-y-3">
        {trials.map((t) => {
          const p = projectMap.get(t.project_id);
          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      <Link href={`/trials/${t.id}`} className="hover:underline">
                        {p?.title ?? 'Trial'}
                      </Link>
                    </CardTitle>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{t.goal}</p>
                  </div>
                  <Badge
                    variant={
                      t.status === 'ACTIVE'
                        ? 'trial'
                        : t.status === 'SUCCESSFUL'
                          ? 'success'
                          : 'muted'
                    }
                  >
                    {t.status as TrialStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t.duration_days}-day sprint · started {formatRelative(t.starts_at)}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/trials/${t.id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
