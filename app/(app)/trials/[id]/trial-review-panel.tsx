'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { submitTrialReviewAction } from '@/app/(app)/matches/trial-actions';
import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reviewee {
  user_id: string;
  display_name: string;
  username: string;
}

const RATING_KEYS = [
  { key: 'communication', label: 'Communication' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'technical', label: 'Technical' },
  { key: 'commitment', label: 'Commitment' },
  { key: 'collaboration', label: 'Collaboration' },
] as const;

interface TrialReviewPanelProps {
  trialId: string;
  reviewerId: string;
  reviewees: Reviewee[];
}

export function TrialReviewPanel(props: TrialReviewPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(props.reviewees[0]?.user_id ?? null);
  const [wouldWorkAgain, setWouldWorkAgain] = useState<'YES' | 'MAYBE' | 'NO'>('YES');
  const [ratings, setRatings] = useState<{
    communication: number;
    reliability: number;
    technical: number;
    commitment: number;
    collaboration: number;
  }>({
    communication: 4,
    reliability: 4,
    technical: 4,
    commitment: 4,
    collaboration: 4,
  });
  function setRating(key: keyof typeof ratings, value: number) {
    setRatings((r) => ({ ...r, [key]: value }));
  }
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<Record<string, boolean>>({});

  function submit() {
    if (!active) return;
    startTransition(async () => {
      const res = await submitTrialReviewAction({
        trialId: props.trialId,
        revieweeId: active,
        wouldWorkAgain,
        ratings: {
          communication: ratings.communication,
          reliability: ratings.reliability,
          technical: ratings.technical,
          commitment: ratings.commitment,
          collaboration: ratings.collaboration,
        },
        comment,
      });
      if (!res.ok) {
        toast({ title: 'Could not submit', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Review submitted', variant: 'success' });
      setDone({ ...done, [active]: true });
      setComment('');
      router.refresh();
    });
  }

  if (props.reviewees.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Peer review</CardTitle>
        <p className="text-xs text-muted-foreground">
          Private. Used to compute reputation. Not shown publicly.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.reviewees.map((r) => {
          const isActive = active === r.user_id;
          if (done[r.user_id]) {
            return (
              <div
                key={r.user_id}
                className="flex items-center gap-2 rounded-md border border-ship/30 bg-ship/5 p-2 text-sm text-ship"
              >
                <Check className="h-4 w-4" />
                <span>Review for {r.display_name} submitted</span>
              </div>
            );
          }
          if (!isActive) {
            return (
              <Button
                key={r.user_id}
                variant="outline"
                size="sm"
                onClick={() => setActive(r.user_id)}
                className="w-full"
              >
                Review {r.display_name}
              </Button>
            );
          }
          return (
            <div key={r.user_id} className="space-y-3 rounded-md border border-border/60 p-3">
              <p className="text-sm font-semibold">{r.display_name}</p>
              <div className="space-y-2">
                {RATING_KEYS.map((rk) => (
                  <div key={rk.key} className="flex items-center justify-between">
                    <Label className="text-xs">{rk.label}</Label>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(rk.key, n)}
                          className="rounded p-0.5 hover:bg-accent"
                          aria-label={`${n} stars`}
                        >
                          <Star
                            className={cn(
                              'h-3.5 w-3.5',
                              n <= (ratings[rk.key] ?? 0)
                                ? 'fill-xp text-xp'
                                : 'text-muted-foreground',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">Would you work with them again?</Label>
                <div className="mt-1 flex gap-2">
                  {(['YES', 'MAYBE', 'NO'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setWouldWorkAgain(v)}
                      className={cn(
                        'flex-1 rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors',
                        wouldWorkAgain === v && 'border-foreground bg-foreground/5',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Comment (optional)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="mt-1"
                  maxLength={1000}
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" loading={pending} onClick={submit}>
                  Submit review
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
