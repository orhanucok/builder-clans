'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sendChatMessageAction, listChatMessagesAction } from '../../actions';
import { cn, formatRelative } from '@/lib/utils';

interface Member {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface ChatTabProps {
  projectId: string;
  channelId: string | null;
  currentUserId: string;
  canPost: boolean;
  members: Member[];
}

export function ChatTab({ projectId, channelId: _channelId, currentUserId, canPost, members }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const scroller = useRef<HTMLDivElement | null>(null);

  // Polling-based chat: every 4 seconds, refresh messages
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await listChatMessagesAction(projectId, 200);
      if (cancelled) return;
      setMessages(list.map((m) => ({ id: m.id, content: m.content, sender_id: m.sender_id, created_at: m.created_at })));
      setLoading(false);
    };
    load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [projectId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  function send() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    startTransition(async () => {
      const res = await sendChatMessageAction({ projectId, content: text });
      if (!res.ok) return;
      // Re-fetch
      const list = await listChatMessagesAction(projectId, 200);
      setMessages(list.map((m) => ({ id: m.id, content: m.content, sender_id: m.sender_id, created_at: m.created_at })));
    });
  }

  return (
    <Card>
      <CardContent className="flex h-[520px] flex-col p-0">
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Post the first one to start the conversation.
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
            placeholder={canPost ? 'Write a message…' : 'You cannot post here.'}
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
