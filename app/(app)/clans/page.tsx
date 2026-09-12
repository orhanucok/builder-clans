'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Users, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { ensureSeeded } from '@/lib/db/store/seed';
import {
  listClans,
  listClanMembers,
  createClan,
  joinClan,
  leaveClan,
} from '@/lib/db/store/queries';
import { getCurrentClientUser } from '@/lib/auth/demo';
import { isPusherConfigured } from '@/lib/realtime';
import { getMemoryDb } from '@/lib/db/store/memory';
import { CLAN_TYPE_LABELS, type ClanType, CLAN_TYPES } from '@/config/constants';

interface ClanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  institution: string | null;
  country_code: string | null;
  owner_id: string;
  lifetime_xp: number;
  member_count: number;
  joined: boolean;
}

function loadInitialClans(): { rows: ClanRow[]; meId: string | null } {
  const me = getCurrentClientUser();
  const meId = me?.id ?? null;
  const list = listClans();
  const rows: ClanRow[] = list.map((c) => {
    const members = listClanMembers(c.id);
    const joined = Boolean(meId && members.some((m) => m.user_id === meId));
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? null,
      type: c.type,
      institution: c.institution ?? null,
      country_code: c.country_code ?? null,
      owner_id: c.owner_id,
      lifetime_xp: c.lifetime_xp ?? 0,
      member_count: members.length,
      joined,
    };
  });
  return { rows, meId };
}

export default function ClansPage() {
  const { toast } = useToast();
  // Hydrate once during render — the in-memory store has been populated by
  // the (app) layout's effect, so reading on first render gives us a
  // single, consistent set of rows. No useEffect, no StrictMode race.
  const [{ rows: initialRows, meId }] = useState(() => {
    void ensureSeeded();
    return loadInitialClans();
  });
  const [clans, setClans] = useState<ClanRow[]>(initialRows);
  const [me, setMe] = useState<string | null>(meId);
  const [signedIn, setSignedIn] = useState<boolean>(Boolean(meId));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const refresh = () => {
    const { rows, meId: id } = loadInitialClans();
    setClans(rows);
    setMe(id);
    setSignedIn(Boolean(id));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clans.filter((c) => {
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.institution?.toLowerCase().includes(q) ?? false) ||
        (c.country_code?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clans, search, typeFilter]);

  async function onJoin(id: string) {
    if (!signedIn) {
      toast({ title: 'Sign in to join', description: 'Pick a persona from /login.', variant: 'error' });
      return;
    }
    const r = await joinClan(id, me!);
    if (!r.ok) {
      toast({ title: 'Could not join', description: r.error, variant: 'error' });
      return;
    }
    toast({ title: 'Joined the clan', variant: 'success' });
    refresh();
  }

  async function onLeave(id: string) {
    const r = await leaveClan(id, me!);
    if (!r.ok) {
      toast({ title: 'Could not leave', description: r.error, variant: 'error' });
      return;
    }
    toast({ title: 'Left the clan', variant: 'success' });
    refresh();
  }

  return (
    <div className="container-wide py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Communities above projects — local chapters, topic collectives, alumni groups.
            {isPusherConfigured() ? null : (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                Same-browser chat (no Pusher key yet)
              </span>
            )}
          </p>
        </div>
        {signedIn ? (
          <Button onClick={() => setShowCreate((v) => !v)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            {showCreate ? 'Cancel' : 'New clan'}
          </Button>
        ) : null}
      </header>

      {showCreate && signedIn ? (
        <CreateClanForm
          ownerId={me!}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clans by name, institution, country…"
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', ...CLAN_TYPES] as const).map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium transition-colors ${
                  active ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-foreground/5'
                }`}
              >
                {t === 'ALL' ? 'All types' : CLAN_TYPE_LABELS[t as ClanType] ?? t}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No clans match"
          description="Try a different filter or clear the search."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const owner = getMemoryDb().profiles.get(c.owner_id);
            const iAmOwner = c.owner_id === me;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="muted">{CLAN_TYPE_LABELS[c.type as ClanType] ?? c.type}</Badge>
                        {c.institution ? <span>· {c.institution}</span> : null}
                        {c.country_code ? <span>· {c.country_code}</span> : null}
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {c.lifetime_xp.toLocaleString()} XP
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  ) : null}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.member_count} members</span>
                    {owner ? <span>Led by {owner.display_name}</span> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/clans/${c.slug}/`}>
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {iAmOwner ? null : c.joined ? (
                      <Button onClick={() => onLeave(c.id)} variant="outline" size="sm">
                        Leave
                      </Button>
                    ) : (
                      <Button onClick={() => onJoin(c.id)} size="sm">
                        Join
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CreateClanFormProps {
  ownerId: string;
  onCreated: (slug: string) => void;
  onCancel: () => void;
}

function CreateClanForm({ ownerId, onCreated, onCancel }: CreateClanFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('TOPIC');
  const [institution, setInstitution] = useState('');
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast({ title: 'Name is too short', variant: 'error' });
      return;
    }
    setBusy(true);
    const r = await createClan({
      name: name.trim(),
      description: description.trim() || null,
      type: type as never,
      owner_id: ownerId,
      institution: institution.trim() || null,
      country_code: country.trim().toUpperCase() || null,
    });
    setBusy(false);
    if (!r.ok) {
      toast({ title: 'Could not create', description: r.error, variant: 'error' });
      return;
    }
    toast({ title: 'Clan created', variant: 'success' });
    onCreated(r.slug);
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Create a clan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cc-name">Name</Label>
            <Input
              id="cc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Klinik Collective"
              required
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cc-desc">Description</Label>
            <Textarea
              id="cc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this clan about?"
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="cc-type">Type</Label>
            <select
              id="cc-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {CLAN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CLAN_TYPE_LABELS[t as ClanType] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cc-country">Country code (optional)</Label>
            <Input
              id="cc-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="TR"
              maxLength={3}
              className="mt-1 uppercase"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cc-institution">Institution (optional)</Label>
            <Input
              id="cc-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. ODTÜ, ITU"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create clan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
