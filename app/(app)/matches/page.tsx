import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { getCurrentUser } from '@/lib/auth/session';
import { formatRelative } from '@/lib/utils';
import { MatchActions } from './match-actions';
import type { MatchStatus } from '@/config/constants';

export const metadata = { title: 'Matches' };

export default async function MatchesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-wide py-10">
        <EmptyState title="Demo mode" description="Configure Supabase to see matches." />
      </div>
    );
  }
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
  const supabase = await createServerSupabase();

  // Matches where I'm the candidate (someone invited me or I applied) OR I'm the initiator.
  const { data: matches } = await supabase
    .from('matches')
    .select('id, project_id, role_id, candidate_user_id, status, final_score, created_at, updated_at')
    .or(`candidate_user_id.eq.${user.id},initiator_user_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (!matches || matches.length === 0) {
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
  const projectIds = Array.from(new Set(matches.map((m) => m.project_id as string)));
  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, title, owner_id, short_description')
    .in('id', projectIds);
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p]));

  const ownerIds = Array.from(new Set((projects ?? []).map((p) => p.owner_id)));
  const { data: ownerProfiles } = ownerIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ownerIds)
    : { data: [] };
  const ownerMap = new Map((ownerProfiles ?? []).map((o) => [o.id, o]));

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
          const p = projectMap.get(m.project_id as string);
          const owner = p ? ownerMap.get(p.owner_id as string) : null;
          return (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {owner?.avatar_url ? <AvatarImage src={owner.avatar_url} /> : null}
                    <AvatarFallback name={owner?.display_name ?? '?'} />
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
                        {owner?.display_name ?? 'Unknown'}
                      </span>
                      {' · '}
                      {formatRelative(m.updated_at as string)}
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
                  projectId={m.project_id as string}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
