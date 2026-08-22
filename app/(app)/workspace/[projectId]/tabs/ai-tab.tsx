'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { generateWeeklySummaryAction } from '../../actions';
import { isFeatureEnabled } from '@/config/feature-flags';

interface AiTabProps {
  projectId: string;
  projectTitle: string;
}

export function AiTab({ projectId, projectTitle }: AiTabProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const aiEnabled = isFeatureEnabled('AI_FEATURES');

  function generate() {
    if (!aiEnabled) {
      toast({
        title: 'AI features are disabled',
        description: 'Set FEATURE_AI=true in your environment to enable them.',
        variant: 'error',
      });
      return;
    }
    startTransition(async () => {
      const res = await generateWeeklySummaryAction(projectId);
      if (!res.ok) {
        toast({ title: 'Could not generate', description: res.error, variant: 'error' });
        return;
      }
      setSummary(res.id ?? null);
    });
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-xp" /> Weekly summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Reads the project&apos;s recent updates, tasks, and milestones, and writes a focused digest.
            Master plan §31: AI suggests, the team decides. We don&apos;t let AI rewrite history.
          </p>
          <Button onClick={generate} loading={pending} disabled={!aiEnabled}>
            <Sparkles className="h-3.5 w-3.5" /> Generate for {projectTitle}
          </Button>
          {summary ? (
            <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-4 text-sm whitespace-pre-wrap">
              {summary}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
