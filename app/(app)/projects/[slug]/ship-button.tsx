'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toaster';
import { markProjectShippedAction } from '../actions';

export function ShipButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function ship() {
    startTransition(async () => {
      const res = await markProjectShippedAction(projectId);
      if (!res.ok) {
        toast({ title: 'Could not ship', description: res.error, variant: 'error' });
        return;
      }
      toast({
        title: 'Project shipped!',
        description: 'The team earned XP and reputation. Nice work.',
        variant: 'success',
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ship">
          <Rocket className="h-4 w-4" /> Ship project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ship this project?</DialogTitle>
          <DialogDescription>
            This marks the project as <strong>Completed</strong> and awards the team big XP and
            reputation. You can still update it later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Not yet
          </Button>
          <Button variant="ship" loading={pending} onClick={ship}>
            <PartyPopper className="h-4 w-4" /> Ship it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
