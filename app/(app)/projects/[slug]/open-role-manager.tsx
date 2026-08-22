'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { createProjectRoleAction } from '@/app/(app)/discover/actions';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const SKILL_SUGGESTIONS = [
  'Python',
  'TypeScript',
  'React',
  'PyTorch',
  'Computer Vision',
  'Medical Imaging',
  'Robotics',
  'ROS',
  'Embedded Systems',
  'Figma',
  'Node.js',
];

interface OpenRoleManagerProps {
  projectId: string;
  children: React.ReactNode;
}

export function OpenRoleManager({ projectId, children }: OpenRoleManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: '',
    description: '',
    commitmentMin: 3,
    commitmentMax: 8,
    experienceLevel: 'ANY' as 'ANY' | 'JUNIOR' | 'MID' | 'SENIOR',
    requiredSkills: [] as string[],
  });

  function addSkill(v: string) {
    const s = v.trim();
    if (!s || form.requiredSkills.includes(s) || form.requiredSkills.length >= 15) return;
    setForm({ ...form, requiredSkills: [...form.requiredSkills, s] });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createProjectRoleAction({ projectId, ...form });
      if (!res.ok) {
        toast({ title: 'Could not add role', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Role added', variant: 'success' });
      setOpen(false);
      setForm({
        title: '',
        description: '',
        commitmentMin: 3,
        commitmentMax: 8,
        experienceLevel: 'ANY',
        requiredSkills: [],
      });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an open role</DialogTitle>
          <DialogDescription>Describe who you&apos;re looking for and how they can help.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="title">Role title</Label>
            <Input
              id="title"
              required
              minLength={2}
              maxLength={80}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1"
              placeholder="ML Engineer, Frontend, Medical Collaborator…"
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
              rows={3}
              maxLength={800}
              placeholder="What will they do? What's the expected outcome?"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="cmMin">Min h/week</Label>
              <Input
                id="cmMin"
                type="number"
                min={1}
                max={80}
                value={form.commitmentMin}
                onChange={(e) => setForm({ ...form, commitmentMin: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cmMax">Max h/week</Label>
              <Input
                id="cmMax"
                type="number"
                min={1}
                max={80}
                value={form.commitmentMax}
                onChange={(e) => setForm({ ...form, commitmentMax: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Experience</Label>
              <Select
                value={form.experienceLevel}
                onValueChange={(v) => setForm({ ...form, experienceLevel: v as never })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any</SelectItem>
                  <SelectItem value="JUNIOR">Junior</SelectItem>
                  <SelectItem value="MID">Mid</SelectItem>
                  <SelectItem value="SENIOR">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Required skills</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {form.requiredSkills.map((s) => (
                <Badge key={s} variant="primary" className="gap-1 pr-1">
                  {s}
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, requiredSkills: form.requiredSkills.filter((x) => x !== s) })
                    }
                    className="rounded p-0.5 hover:bg-foreground/10"
                    aria-label={`Remove ${s}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter((s) => !form.requiredSkills.includes(s))
                .slice(0, 6)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent"
                  >
                    + {s}
                  </button>
                ))}
            </div>
            <Input
              className="mt-2"
              placeholder="Add a skill and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              <Plus className="h-4 w-4" /> Add role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
