import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ensureSeeded, db } from '@/lib/db/store';
import { getCurrentUser } from '@/lib/auth/session';
import { formatRelative } from '@/lib/utils';
import { MatchActions } from './match-actions';
import type { MatchStatus } from '@/config/constants';

export const metadata = { title: 'Matches' };
export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          title="Log in to see matches"
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Matches where I'm the candidate or I'm the initiator.
  const matches = db.matches
    .all()
    .filter((m) => m.candidate_user_id === user.id || m.initiator_user_id === user.id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 50);

  if (matches.length === 0) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="No matches yet"
          description="Apply to a project or open a project role to start receiving matches."
          action={
            <Button asChild>
              <Link href="/discover">Browse projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Enrich with project + counterparty
  const projectIds = Array.from(new Set(matches.map((m) => m.project_id)));
  const projects = (db.projects.all() as any).filter((p) => projectIds.includes(p.id));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const ownerIds = Array.from(new Set(projects.map((p) => p.owner_id)));
  const ownerProfiles = (db.profiles.all() as any).filter((o) => ownerIds.includes(o.id));
  const ownerMap = new Map(ownerProfiles.map((o) => [o.id, o]));

  // Counterparties: the "other side" of each match
  const counterpartyIds = Array.from(new Set(
    matches.map((m) => m.candidate_user_id === user.id ? m.initiator_user_id : m.candidate_user_id),
  ));
  const counterpartyProfiles = (db.profiles.all() as any).filter((p) => counterpartyIds.includes(p.id));
  const counterpartiesMap = new Map(counterpartyProfiles.map((p) => [p.id, p]));

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitations and applications. When both sides say yes, you can start a Trial Sprint.
        </p>
      </header>
      <div className="space-y-3">
        {matches.map((m) => {
          const p = projectMap.get(m.project_id);
          const owner = p ? ownerMap.get(p.owner_id) : null;
          return (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {(m.candidate_user_id === user.id ? counterpartiesMap : owner ? null : null)?.avatar_url ? null : null}
                    <AvatarFallback name={(() => {
                      const iAmCandidate = m.candidate_user_id === user.id;
                      const cid = iAmCandidate ? m.initiator_user_id : m.candidate_user_id;
                      const c = counterpartiesMap.get(cid);
                      return c?.display_name ?? owner?.display_name ?? '?';
                    })()} />
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      <Link href={`/projects/${p?.slug}`} className="hover:underline">
                        {p?.title ?? 'Project'}
                      </Link>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {m.candidate_user_id === user.id ? 'You matched with ' : 'You invited '}
                      <span className="font-medium text-foreground">
                        {(() => {
                          const iAmCandidate = m.candidate_user_id === user.id;
                          const cid = iAmCandidate ? m.initiator_user_id : m.candidate_user_id;
                          return counterpartiesMap.get(cid)?.display_name ?? owner?.display_name ?? 'Unknown';
                        })()}
                      </span>
                      {' · '}
                      {formatRelative(m.updated_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      m.status === 'MUTUAL'
                        ? 'success'
                        : m.status === 'INVITED' || m.status === 'APPLIED'
                          ? 'trial'
                          : m.status === 'TRIAL_STARTED'
                            ? 'info'
                            : 'muted'
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="line-clamp-1 text-sm text-muted-foreground">
                  {p?.short_description}
                </p>
                <MatchActions
                  matchId={m.id}
                  status={m.status as MatchStatus}
                  iAmCandidate={m.candidate_user_id === user.id}
                  projectId={m.project_id}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
