'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { Plus, Send } from 'lucide-react';
import {
  addTrialTaskAction, setTrialTaskStatusAction, setTrialTaskAssigneeAction,
  sendTrialMessageAction, listTrialMessagesAction,
} from '@/app/(app)/matches/trial-actions';
import { cn, formatRelative } from '@/lib/utils';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
};

interface Member {
  user_id: string;
  role: 'OWNER' | 'COLLABORATOR';
  display_name: string;
  username: string;
  avatar_url: string | null;
}

const COLUMNS: Array<{ key: TaskRow['status']; label: string }> = [
  { key: 'TODO', label: 'To do' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'DONE', label: 'Done' },
  { key: 'BLOCKED', label: 'Blocked' },
];

interface TrialTabsProps {
  trialId: string;
  projectId: string;
  channelId: string | null;
  currentUserId: string;
  canPost: boolean;
  canCreateTask: boolean;
  tasks: TaskRow[];
  members: Member[];
}

export function TrialTabs(props: TrialTabsProps) {
  return (
    <Tabs defaultValue="tasks">
      <TabsList>
        <TabsTrigger value="tasks">Tasks ({props.tasks.length})</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="files">Files & links</TabsTrigger>
      </TabsList>
      <TabsContent value="tasks">
        <TaskBoard {...props} />
      </TabsContent>
      <TabsContent value="chat">
        <ChatPanel {...props} />
      </TabsContent>
      <TabsContent value="files">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Add your meeting links, repos, and docs in the project workspace. Trial uses the project
            room&apos;s chat and tasks. (Native channels come online once the team converts.)
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function TaskBoard({ trialId, projectId, tasks, canCreateTask, members }: TrialTabsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function addTask() {
    if (!draft.trim()) return;
    const title = draft.trim();
    setDraft('');
    setAdding(false);
    startTransition(async () => {
      const res = await addTrialTaskAction({ trialId, projectId, title, priority: 'MEDIUM' });
      if (!res.ok) {
        toast({ title: 'Could not add task', description: res.error, variant: 'error' });
        return;
      }
      router.refresh();
    });
  }

  function setStatus(taskId: string, status: TaskRow['status']) {
    startTransition(async () => {
      await setTrialTaskStatusAction({ taskId, status });
      router.refresh();
    });
  }

  function assign(taskId: string, assigneeId: string | null) {
    startTransition(async () => {
      await setTrialTaskAssigneeAction({ taskId, assigneeId });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Kanban</h2>
        {canCreateTask ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
            <Plus className="h-3.5 w-3.5" /> New task
          </Button>
        ) : null}
      </div>

      {adding ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Task title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask();
              }}
              autoFocus
            />
            <Button size="sm" loading={pending} onClick={addTask}>
              Add
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </h3>
                <span className="text-[10px] text-muted-foreground">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.map((t) => {
                  const assignee = members.find((m) => m.user_id === t.assignee_id);
                  return (
                    <Card key={t.id} className="bg-card">
                      <CardContent className="space-y-2 p-3">
                        <p className="text-sm font-medium">{t.title}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="muted" className="text-[10px]">
                            {t.priority}
                          </Badge>
                          {canCreateTask ? (
                            <Select
                              value={t.assignee_id ?? 'none'}
                              onValueChange={(v) => assign(t.id, v === 'none' ? null : v)}
                            >
                              <SelectTrigger className="h-7 w-[120px] text-xs">
                                <SelectValue placeholder="Unassigned" />
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
                          ) : assignee ? (
                            <span className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                {assignee.avatar_url ? <AvatarImage src={assignee.avatar_url} /> : null}
                                <AvatarFallback name={assignee.display_name} />
                              </Avatar>
                              {assignee.display_name}
                            </span>
                          ) : null}
                        </div>
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

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

function ChatPanel({ trialId, channelId, currentUserId, canPost, members }: TrialTabsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Polling-based chat: every 4 seconds, refresh messages
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    const load = async () => {
      const list = await listTrialMessagesAction(trialId, 200);
      if (cancelled) return;
      setMessages(list.map((m) => ({ id: m.id, content: m.content, sender_id: m.sender_id, created_at: m.created_at })));
      setLoading(false);
    };
    load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [channelId, trialId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages.length]);

  function send() {
    if (!draft.trim() || !channelId) return;
    const text = draft.trim();
    setDraft('');
    startTransition(async () => {
      const res = await sendTrialMessageAction({ channelId, content: text });
      if (!res.ok) {
        toast({ title: 'Could not send', description: res.error, variant: 'error' });
        return;
      }
      // Re-fetch
      const list = await listTrialMessagesAction(trialId, 200);
      setMessages(list.map((m) => ({ id: m.id, content: m.content, sender_id: m.sender_id, created_at: m.created_at })));
    });
  }

  return (
    <Card>
      <CardContent className="flex h-[480px] flex-col p-0">
        <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hi and align on the goal.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              const sender = members.find((mm) => mm.user_id === m.sender_id);
              return (
                <div key={m.id} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
                  <Avatar className="h-7 w-7">
                    {sender?.avatar_url ? <AvatarImage src={sender.avatar_url} /> : null}
                    <AvatarFallback name={sender?.display_name ?? '?'} />
                  </Avatar>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg border border-border/60 bg-card p-2 px-3 text-sm',
                      mine && 'border-primary/30 bg-primary/5',
                    )}
                  >
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {sender?.display_name ?? 'Unknown'}{' '}
                      <span className="font-normal opacity-70">· {formatRelative(m.created_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={canPost ? 'Write a message…' : 'You cannot post in this trial.'}
            disabled={!canPost}
          />
          <Button size="icon" onClick={send} disabled={!canPost || !draft.trim() || pending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
