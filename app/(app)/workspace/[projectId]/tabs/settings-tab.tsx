'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toaster';
import { markProjectShippedAction } from '@/app/(app)/projects/actions';
import { Rocket } from 'lucide-react';
import { PROJECT_CATEGORY_LABELS, type ProjectCategory } from '@/config/constants';

interface SettingsTabProps {
  project: Record<string, unknown>;
}

export function SettingsTab({ project }: SettingsTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function ship() {
    startTransition(async () => {
      const res = await markProjectShippedAction(project.id as string);
      if (!res.ok) {
        toast({ title: 'Could not ship', description: res.error, variant: 'error' });
        return;
      }
      toast({
        title: 'Project shipped',
        description: 'The team earned XP and reputation. Well done.',
        variant: 'success',
      });
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current status</span>
            <Badge variant="muted">{project.status as string}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">
              {PROJECT_CATEGORY_LABELS[project.category as ProjectCategory]}
            </span>
          </div>
          <Separator />
          <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
            <p className="font-medium">Edit project details</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Title, description, and stage are editable from the public project page.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/projects/${project.slug as string}`}>Open project page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ship/30">
        <CardHeader>
          <CardTitle className="text-base">Ship this project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Mark the project as <strong>Completed</strong>. Every active team member earns XP and
            reputation. This is the moment the network measures.
          </p>
          {confirming ? (
            <div className="space-y-2 rounded-md border border-ship/30 bg-ship/5 p-3">
              <p className="font-medium">Ship {project.title as string}?</p>
              <div className="flex gap-2">
                <Button variant="ship" loading={pending} onClick={ship}>
                  <Rocket className="h-4 w-4" /> Yes, ship it
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Not yet
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ship" onClick={() => setConfirming(true)} disabled={project.status === 'COMPLETED'}>
              <Rocket className="h-4 w-4" /> Ship project
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
