'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createTaskAction, setTaskStatusAction, createMilestoneAction } from '../../actions';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee_id: string | null;
  due_date: string | null;
}

interface Member {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface Milestone {
  id: string;
  title: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
}

const COLUMNS: Array<{ key: Task['status']; label: string; tone: string }> = [
  { key: 'TODO', label: 'To do', tone: 'border-border/60 bg-muted/30' },
  { key: 'IN_PROGRESS', label: 'In progress', tone: 'border-reputation/30 bg-reputation/5' },
  { key: 'DONE', label: 'Done', tone: 'border-ship/30 bg-ship/5' },
  { key: 'BLOCKED', label: 'Blocked', tone: 'border-destructive/30 bg-destructive/5' },
];

interface TasksTabProps {
  projectId: string;
  canCreate: boolean;
  tasks: Task[];
  members: Member[];
  milestones: Milestone[];
}

export function TasksTab(props: TasksTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  function setStatus(taskId: string, status: Task['status']) {
    startTransition(async () => {
      const res = await setTaskStatusAction({ taskId, status });
      if (!res.ok) {
        toast({ title: 'Could not update', description: res.error, variant: 'error' });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {props.canCreate ? (
        <div className="flex justify-end gap-2">
          <NewTaskDialog {...props} />
          <NewMilestoneDialog projectId={props.projectId} />
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = props.tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={cn('rounded-lg border p-3', col.tone)}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </h3>
                <span className="text-[10px] text-muted-foreground">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.map((t) => {
                  const assignee = props.members.find((m) => m.user_id === t.assignee_id);
                  return (
                    <Card key={t.id} className="bg-card">
                      <CardContent className="space-y-2 p-3">
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.description ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        ) : null}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="muted" className="text-[10px]">
                            {t.priority}
                          </Badge>
                          {assignee ? (
                            <span className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                {assignee.avatar_url ? <AvatarImage src={assignee.avatar_url} /> : null}
                                <AvatarFallback name={assignee.display_name} />
                              </Avatar>
                              {assignee.display_name}
                            </span>
                          ) : null}
                        </div>
                        {props.canCreate ? (
                          <div className="flex flex-wrap gap-1">
                            {COLUMNS.filter((c) => c.key !== t.status).map((c) => (
                              <button
                                key={c.key}
                                onClick={() => setStatus(t.id, c.key)}
                                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent"
                              >
                                → {c.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
                {list.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">No tasks here.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewTaskDialog({ projectId, members, milestones }: TasksTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Task['priority'],
    status: 'TODO' as Task['status'],
    assigneeId: '',
    milestoneId: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTaskAction(projectId, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        assigneeId: form.assigneeId || undefined,
        milestoneId: form.milestoneId || undefined,
      });
      if (!res.ok) {
        toast({ title: 'Could not add task', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Task added', variant: 'success' });
      setOpen(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', assigneeId: '', milestoneId: '' });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a focused unit of work.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              required
              minLength={1}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as Task['priority'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Task['status'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select
                value={form.assigneeId || 'none'}
                onValueChange={(v) => setForm({ ...form, assigneeId: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Milestone</Label>
              <Select
                value={form.milestoneId || 'none'}
                onValueChange={(v) => setForm({ ...form, milestoneId: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewMilestoneDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ title: '', description: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createMilestoneAction(projectId, {
        title: form.title,
        description: form.description || undefined,
        status: 'PLANNED',
      });
      if (!res.ok) {
        toast({ title: 'Could not add milestone', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Milestone added', variant: 'success' });
      setOpen(false);
      setForm({ title: '', description: '' });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Milestone
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>A meaningful checkpoint the team is working toward.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              required
              minLength={1}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Add milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
