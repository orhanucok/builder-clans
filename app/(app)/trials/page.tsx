import Link from 'next/link';
import { Hammer, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { getCurrentUser } from '@/lib/auth/session';
import { formatRelative } from '@/lib/utils';
import type { TrialStatus } from '@/config/constants';

export const metadata = { title: 'Trials' };

export default async function TrialsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-wide py-10">
        <EmptyState title="Demo mode" description="Configure Supabase to see trials." />
      </div>
    );
  }
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
  const supabase = await createServerSupabase();
  // trials where I'm a member
  const { data: myMemberships } = await supabase
    .from('trial_members')
    .select('trial_id')
    .eq('user_id', user.id);
  const ids = (myMemberships ?? []).map((m) => m.trial_id as string);
  if (ids.length === 0) {
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
  const { data: trials } = await supabase
    .from('trials')
    .select('id, project_id, status, goal, duration_days, starts_at, ends_at')
    .in('id', ids)
    .order('starts_at', { ascending: false });

  const projectIds = Array.from(new Set((trials ?? []).map((t) => t.project_id as string)));
  const { data: projects } = projectIds.length
    ? await supabase.from('projects').select('id, slug, title').in('id', projectIds)
    : { data: [] };
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test how you work together before you commit. A successful trial becomes a team.
        </p>
      </header>
      <div className="space-y-3">
        {(trials ?? []).map((t) => {
          const p = projectMap.get(t.project_id as string);
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
                          : t.status === 'ENDED' || t.status === 'EXPIRED'
                            ? 'muted'
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
                  {t.duration_days}-day sprint · started {formatRelative(t.starts_at as string)}
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
