'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toaster';
import { decideApplicationAction, inviteCandidateAction } from '@/app/(app)/discover/actions';
import { formatRelative } from '@/lib/utils';
import { Check, X, Sparkles } from 'lucide-react';

interface ApplicationRow {
  id: string;
  applicant_id: string;
  role_id: string | null;
  why_interested: string | null;
  contribution: string | null;
  hours_per_week: number | null;
  note: string | null;
  status: string;
  created_at: string;
  project_id: string;
}
interface ApplicantProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
}

export function ApplicationList({
  applications,
  profiles,
}: {
  applications: ApplicationRow[];
  profiles: ApplicantProfile[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="When someone applies, you&apos;ll see them here with their reason and what they can contribute."
      />
    );
  }
  function decide(appId: string, decision: 'ACCEPTED' | 'REJECTED') {
    startTransition(async () => {
      const res = await decideApplicationAction({ applicationId: appId, decision });
      if (!res.ok) {
        toast({ title: 'Could not decide', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: decision === 'ACCEPTED' ? 'Application accepted' : 'Application rejected', variant: 'success' });
      router.refresh();
    });
  }
  function invite(projectId: string, candidateUserId: string) {
    startTransition(async () => {
      const res = await inviteCandidateAction({ projectId, candidateUserId });
      if (!res.ok) {
        toast({ title: 'Could not invite', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Invite sent', variant: 'success' });
    });
  }

  return (
    <div className="space-y-3">
      {applications.map((a) => {
        const p = profileMap.get(a.applicant_id);
        return (
          <Card key={a.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {p?.avatar_url ? <AvatarImage src={p.avatar_url} /> : null}
                  <AvatarFallback name={p?.display_name ?? '?'} />
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={p ? `/people/${p.username}` : '#'}
                    className="text-sm font-semibold hover:underline"
                  >
                    {p?.display_name ?? 'Unknown'}
                  </Link>
                  {p?.headline ? <p className="truncate text-xs text-muted-foreground">{p.headline}</p> : null}
                </div>
                <Badge variant={a.status === 'PENDING' ? 'trial' : a.status === 'ACCEPTED' ? 'success' : 'muted'}>
                  {a.status}
                </Badge>
              </div>
              {a.why_interested ? (
                <p className="text-sm text-foreground/90">
                  <span className="text-muted-foreground">Why: </span>
                  {a.why_interested}
                </p>
              ) : null}
              {a.contribution ? (
                <p className="text-sm text-foreground/90">
                  <span className="text-muted-foreground">Can contribute: </span>
                  {a.contribution}
                </p>
              ) : null}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {a.hours_per_week ?? '?'} h/week · {formatRelative(a.created_at)}
                </span>
                {a.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={pending}
                      onClick={() => invite(a.project_id, a.applicant_id)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Invite
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pending}
                      onClick={() => decide(a.id, 'REJECTED')}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" loading={pending} onClick={() => decide(a.id, 'ACCEPTED')}>
                      <Check className="h-3.5 w-3.5" /> Accept
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
