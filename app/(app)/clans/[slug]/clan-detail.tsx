'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { ensureSeeded } from '@/lib/db/store/seed';
import {
  getClanBySlug,
  listClanMembers,
  joinClan,
  leaveClan,
} from '@/lib/db/store/queries';
import { getCurrentClientUser } from '@/lib/auth/demo';
import {
  subscribe as rtSubscribe,
  sendMessage as rtSend,
  isPusherConfigured,
  pingPresence,
  getPresenceCount,
  subscribePresence,
} from '@/lib/realtime';
import { getMemoryDb } from '@/lib/db/store/memory';
import { CLAN_TYPE_LABELS, type ClanType } from '@/config/constants';

interface Member {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  role: string;
  joined_at: string;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  ts: number;
}

export function ClanDetail({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<{ id: string; username: string; display_name: string; avatar_url: string | null } | null>(null);
  const [clan, setClan] = useState<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: string;
    institution: string | null;
    country_code: string | null;
    owner_id: string;
    lifetime_xp: number;
  } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [presence, setPresence] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channel = useMemo(() => (clan ? `clan-${clan.id}` : null), [clan]);

  const refresh = async () => {
    await ensureSeeded();
    const c = getClanBySlug(slug);
    if (!c) {
      setClan(null);
      setReady(true);
      return;
    }
    setClan({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? null,
      type: c.type,
      institution: c.institution ?? null,
      country_code: c.country_code ?? null,
      owner_id: c.owner_id,
      lifetime_xp: c.lifetime_xp ?? 0,
    });
    const u = getCurrentClientUser();
    if (u) {
      setMe({
        id: u.id,
        username: u.username,
        display_name: u.displayName,
        avatar_url: null,
      });
      setSignedIn(true);
    } else {
      setMe(null);
      setSignedIn(false);
    }
    const db = getMemoryDb();
    const memberRows = listClanMembers(c.id);
    const userIds = new Set(memberRows.map((m) => m.user_id));
    const profileRows = db.profiles.all().filter((p) => userIds.has(p.id));
    const profileMap = new Map(profileRows.map((p) => [p.id, p]));
    setMembers(
      memberRows.map((m) => {
        const p = profileMap.get(m.user_id);
        return {
          id: m.user_id,
          username: p?.username ?? 'unknown',
          display_name: p?.display_name ?? 'Builder',
          avatar_url: p?.avatar_url ?? null,
          headline: p?.headline ?? null,
          role: m.role,
          joined_at: m.joined_at,
        };
      }),
    );
    setReady(true);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Real-time chat subscription
  useEffect(() => {
    if (!channel || !me) return;
    let unsub: (() => void) | null = null;
    let unsubPresence: (() => void) | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;
    (async () => {
      unsub = await rtSubscribe(channel, (msg) => {
        if (msg.type !== 'message') return;
        const payload = msg.payload as {
          id: string;
          content: string;
          sender_id: string;
          sender_name: string;
          sender_avatar: string | null;
        };
        setMessages((cur) => {
          if (cur.some((m) => m.id === payload.id)) return cur;
          return [
            ...cur,
            {
              id: payload.id,
              sender_id: payload.sender_id,
              sender_name: payload.sender_name,
              sender_avatar: payload.sender_avatar,
              content: payload.content,
              ts: msg.ts,
            },
          ];
        });
      });
      pingPresence(channel, me.id);
      tick = setInterval(() => pingPresence(channel, me.id), 10_000);
      unsubPresence = subscribePresence(channel, () => {
        setPresence(getPresenceCount(channel));
      });
      setPresence(getPresenceCount(channel));
    })();
    return () => {
      unsub?.();
      unsubPresence?.();
      if (tick) clearInterval(tick);
    };
  }, [channel, me]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function onJoin() {
    if (!clan || !me) {
      toast({ title: 'Sign in to join', description: 'Pick a persona from /login.', variant: 'error' });
      return;
    }
    const r = await joinClan(clan.id, me.id);
    if (!r.ok) {
      toast({ title: 'Could not join', description: r.error, variant: 'error' });
      return;
    }
    toast({ title: 'Joined the clan', variant: 'success' });
    refresh();
  }

  async function onLeave() {
    if (!clan || !me) return;
    const r = await leaveClan(clan.id, me.id);
    if (!r.ok) {
      toast({ title: 'Could not leave', description: r.error, variant: 'error' });
      return;
    }
    toast({ title: 'Left the clan', variant: 'success' });
    refresh();
  }

  function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!channel || !me || !clan) return;
    const content = draft.trim();
    if (!content) return;
    const id = `msg_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    const payload = {
      id,
      content,
      sender_id: me.id,
      sender_name: me.display_name,
      sender_avatar: me.avatar_url,
    };
    setMessages((cur) =>
      cur.some((m) => m.id === id)
        ? cur
        : [
            ...cur,
            {
              id,
              sender_id: me.id,
              sender_name: me.display_name,
              sender_avatar: me.avatar_url,
              content,
              ts: Date.now(),
            },
          ],
    );
    rtSend(channel, payload, me.id);
    setDraft('');
  }

  if (!ready) {
    return (
      <div className="container-wide grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
        Loading clan…
      </div>
    );
  }

  if (!clan) {
    return (
      <div className="container-narrow py-10">
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Clan not found"
          description="Maybe it was renamed or removed."
          action={
            <Button asChild variant="outline">
              <Link href="/clans/">Back to clans</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isOwner = me?.id === clan.owner_id;
  const isMember = members.some((m) => m.id === me?.id);

  return (
    <div className="container-wide py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/clans/">
          <ArrowLeft className="h-3.5 w-3.5" />
          All clans
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{clan.name}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="muted">{CLAN_TYPE_LABELS[clan.type as ClanType] ?? clan.type}</Badge>
                    {clan.institution ? <span>· {clan.institution}</span> : null}
                    {clan.country_code ? <span>· {clan.country_code}</span> : null}
                    <span>· {members.length} members</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <Badge variant="outline">You are the owner</Badge>
                  ) : signedIn && isMember ? (
                    <Button onClick={onLeave} variant="outline" size="sm">
                      Leave clan
                    </Button>
                  ) : signedIn ? (
                    <Button onClick={onJoin} size="sm">
                      Join clan
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link href="/login/">Sign in to join</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clan.description ? (
                <p className="text-sm text-muted-foreground">{clan.description}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No description yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  <span className="inline-flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Clan chat
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{presence || 1} online</span>
                  {isPusherConfigured() ? (
                    <Badge variant="muted" className="bg-emerald-500/15 text-emerald-700">
                      live
                    </Badge>
                  ) : (
                    <Badge variant="muted">same-browser</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!signedIn ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  <Link href="/login/" className="font-medium text-foreground hover:underline">
                    Sign in
                  </Link>{' '}
                  to send messages. Reading is open.
                </div>
              ) : !isMember ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  Join the clan to participate in the chat.
                </div>
              ) : null}

              <div
                ref={scrollRef}
                className="max-h-[420px] min-h-[180px] space-y-2 overflow-y-auto rounded-md border border-border/60 bg-background p-3"
              >
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    No messages yet. Be the first to say hi.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === me?.id;
                    return (
                      <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse text-right' : ''}`}>
                        <Avatar className="h-7 w-7 shrink-0">
                          {m.sender_avatar ? <AvatarImage src={m.sender_avatar} /> : null}
                          <AvatarFallback name={m.sender_name} />
                        </Avatar>
                        <div
                          className={`min-w-0 max-w-[80%] rounded-md px-3 py-1.5 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        >
                          <p className="text-[11px] font-medium opacity-80">{m.sender_name}</p>
                          <p className="break-words">{m.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={onSend} className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={signedIn && isMember ? 'Send a message…' : 'Sign in and join to chat'}
                  disabled={!signedIn || !isMember}
                  maxLength={500}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!signedIn || !isMember || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">No members yet.</p>
              ) : (
                members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/people/${m.username}/`}
                    className="flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-foreground/5"
                  >
                    <Avatar className="h-7 w-7">
                      {m.avatar_url ? <AvatarImage src={m.avatar_url} /> : null}
                      <AvatarFallback name={m.display_name} />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.display_name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        @{m.username} · {m.role.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Lifetime XP</span>
                <span className="font-medium text-foreground">
                  {clan.lifetime_xp.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Type</span>
                <span className="font-medium text-foreground">
                  {CLAN_TYPE_LABELS[clan.type as ClanType] ?? clan.type}
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
