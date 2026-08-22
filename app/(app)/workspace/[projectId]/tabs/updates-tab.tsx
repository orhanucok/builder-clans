'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toaster';
import { postProjectUpdateAction } from '../../actions';
import { formatRelative } from '@/lib/utils';

interface UpdateRow {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  visibility: 'TEAM' | 'PUBLIC';
}

interface UpdatesTabProps {
  projectId: string;
  canPost: boolean;
  updates: UpdateRow[];
}

export function UpdatesTab({ projectId, canPost, updates }: UpdatesTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'TEAM' | 'PUBLIC'>('TEAM');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 10) {
      toast({ title: 'Update too short', description: 'Write at least 10 characters.', variant: 'error' });
      return;
    }
    startTransition(async () => {
      const res = await postProjectUpdateAction(projectId, { body, visibility });
      if (!res.ok) {
        toast({ title: 'Could not post', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Update posted', variant: 'success' });
      setBody('');
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {updates.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No updates yet. Post a weekly summary to keep the team aligned.
            </CardContent>
          </Card>
        ) : (
          updates.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {u.author_avatar ? <AvatarImage src={u.author_avatar} /> : null}
                      <AvatarFallback name={u.author_name} />
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.author_name}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(u.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant={u.visibility === 'PUBLIC' ? 'info' : 'muted'}>{u.visibility}</Badge>
                </div>
                <p className="whitespace-pre-line text-sm text-foreground/90">{u.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {canPost ? (
        <div>
          <Card>
            <CardContent className="space-y-3 p-4">
              <Label>Post an update</Label>
              <Textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`What did we accomplish?\nWhat changed?\nWhat are we doing next?\nAny blockers?`}
                maxLength={4000}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-1">
                  {(['TEAM', 'PUBLIC'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      className={`rounded border border-border px-2 py-0.5 ${visibility === v ? 'bg-foreground/5' : ''}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button size="sm" loading={pending} onClick={submit} disabled={body.trim().length < 10}>
                  <Send className="h-3.5 w-3.5" /> Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
