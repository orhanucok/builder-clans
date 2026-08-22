'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toaster';
import { applyToProjectAction } from '@/app/(app)/discover/actions';

interface ApplyDialogProps {
  projectId: string;
  roleId: string | null;
  children?: React.ReactNode;
}

export function ApplyDialog({ projectId, roleId, children }: ApplyDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    whyInterested: '',
    contribution: '',
    hoursPerWeek: 5,
    note: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await applyToProjectAction({
        projectId,
        roleId: roleId ?? undefined,
        whyInterested: form.whyInterested,
        contribution: form.contribution,
        hoursPerWeek: form.hoursPerWeek,
        note: form.note,
      });
      if (!res.ok) {
        toast({ title: 'Could not apply', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Application sent', description: 'The project owner has been notified.', variant: 'success' });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button>Apply to join</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply to join</DialogTitle>
          <DialogDescription>
            Tell the owner why you&apos;re interested and what you can contribute.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="why">Why are you interested?</Label>
            <Textarea
              id="why"
              value={form.whyInterested}
              onChange={(e) => setForm({ ...form, whyInterested: e.target.value })}
              rows={3}
              maxLength={1000}
              className="mt-1"
              placeholder="What draws you to this project?"
            />
          </div>
          <div>
            <Label htmlFor="contrib">What can you contribute?</Label>
            <Textarea
              id="contrib"
              value={form.contribution}
              onChange={(e) => setForm({ ...form, contribution: e.target.value })}
              rows={3}
              maxLength={1000}
              className="mt-1"
              placeholder="Skills, past work, ideas."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hours">Hours per week</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={80}
                value={form.hoursPerWeek}
                onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                maxLength={500}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Send application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
