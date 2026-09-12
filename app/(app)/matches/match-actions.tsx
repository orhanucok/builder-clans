'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { acceptMatchAction, declineMatchAction } from '@/app/(app)/discover/actions';
import { createTrialAction } from './trial-actions';
import type { MatchStatus } from '@/config/constants';

interface MatchActionsProps {
  matchId: string;
  status: MatchStatus;
  iAmCandidate: boolean;
  projectId: string;
}

export function MatchActions({ matchId, status, iAmCandidate, projectId }: MatchActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const res = await acceptMatchAction(matchId);
      if (!res.ok) {
        toast({ title: 'Could not accept', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Match accepted', variant: 'success' });
      router.refresh();
    });
  }
  function decline() {
    startTransition(async () => {
      const res = await declineMatchAction(matchId);
      if (!res.ok) {
        toast({ title: 'Could not decline', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Match declined' });
      router.refresh();
    });
  }
  function startTrial() {
    startTransition(async () => {
      const res = await createTrialAction({ matchId, projectId, durationDays: 7 });
      if (!res.ok) {
        toast({ title: 'Could not start trial', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Trial started', variant: 'success' });
      router.push(`/trials/${res.id}`);
    });
  }

  if (status === 'INVITED' || status === 'APPLIED') {
    return (
      <div className="flex gap-2">
        {iAmCandidate && status === 'INVITED' ? (
          <>
            <Button size="sm" variant="ghost" loading={pending} onClick={decline}>
              Decline
            </Button>
            <Button size="sm" loading={pending} onClick={accept}>
              Accept
            </Button>
          </>
        ) : null}
        {!iAmCandidate && status === 'APPLIED' ? (
          <>
            <Button size="sm" variant="ghost" loading={pending} onClick={decline}>
              Reject
            </Button>
            <Button size="sm" loading={pending} onClick={accept}>
              Accept
            </Button>
          </>
        ) : null}
      </div>
    );
  }
  if (status === 'MUTUAL') {
    return (
      <Button size="sm" variant="trial" loading={pending} onClick={startTrial}>
        Start Trial Sprint â†’
      </Button>
    );
  }
  if (status === 'TRIAL_STARTED') {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/trials">Open trial</Link>
      </Button>
    );
  }
  return null;
}
