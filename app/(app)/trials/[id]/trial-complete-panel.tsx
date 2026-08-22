'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { completeTrialAction } from '@/app/(app)/matches/trial-actions';
import { Check, X } from 'lucide-react';

export function TrialCompletePanel({ trialId }: { trialId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function decide(decision: 'SUCCESSFUL' | 'ENDED') {
    startTransition(async () => {
      const res = await completeTrialAction({ trialId, decision });
      if (!res.ok) {
        toast({ title: 'Could not complete', description: res.error, variant: 'error' });
        return;
      }
      toast({
        title: decision === 'SUCCESSFUL' ? 'Trial successful' : 'Trial ended',
        description:
          decision === 'SUCCESSFUL'
            ? 'The candidate is now a project member. Both of you earned XP and reputation.'
            : 'The other person is back in the matching pool.',
        variant: 'success',
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">End the trial</CardTitle>
        <p className="text-xs text-muted-foreground">
          Choose what to do at the end of the sprint. The other person is notified.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button loading={pending} onClick={() => decide('SUCCESSFUL')}>
          <Check className="h-4 w-4" /> Mark successful — they join the team
        </Button>
        <Button variant="outline" loading={pending} onClick={() => decide('ENDED')}>
          <X className="h-4 w-4" /> End without converting
        </Button>
      </CardContent>
    </Card>
  );
}
