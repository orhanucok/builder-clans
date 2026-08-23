import Link from 'next/link';
import { Users, MapPin, GraduationCap } from 'lucide-react';
import { ensureSeeded, db } from '@/lib/db/store';
import { getProfileSkills } from '@/lib/db/store/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  USER_TYPES, USER_TYPE_LABELS, REMOTE_MODES, REMOTE_MODE_LABELS,
  type UserType, type RemoteMode,
} from '@/config/constants';
import { cn } from '@/lib/utils';

export const metadata = { title: 'People' };
export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  type?: UserType;
  remote?: RemoteMode;
}

interface PersonCard {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  userType: string | null;
  location: string | null;
  institution: string | null;
  remotePreference: string | null;
  weeklyHours: string | null;
  builderLevel: number;
  reputationScore: number;
  skills: string[];
  projectCount: number;
}

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  await ensureSeeded();
  const q = searchParams.q?.toLowerCase() ?? '';
  const type = searchParams.type;
  const remote = searchParams.remote;

  // Build person cards from the data store
  const allProfiles = (db.profiles.all() as any[]).filter((p) => p.onboarding_completed);
  const allProjects = (db.projects.all() as any[]);
  const cards: PersonCard[] = allProfiles.map((p) => {
    const projectCount = allProjects.filter((proj) => proj.owner_id === p.id).length;
    return {
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      headline: p.headline,
      userType: p.user_type,
      location: p.location,
      institution: p.institution,
      remotePreference: p.remote_preference,
      weeklyHours: p.weekly_hours,
      builderLevel: p.builder_level ?? 1,
      reputationScore: p.reputation_score ?? 50,
      skills: getProfileSkills(p.id),
      projectCount,
    };
  });

  // Filter
  const filtered = cards.filter((c) => {
    if (q) {
      const blob = `${c.displayName} ${c.username} ${c.headline ?? ''} ${c.skills.join(' ')} ${c.location ?? ''} ${c.institution ?? ''}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (type && c.userType !== type) return false;
    if (remote && c.remotePreference !== remote) return false;
    return true;
  }).sort((a, b) => (b.builderLevel + b.reputationScore / 100) - (a.builderLevel + a.reputationScore / 100));

  const buildHref = (param: string, value: string | null) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (type) p.set('type', type);
    if (remote) p.set('remote', remote);
    if (value === null) p.delete(param);
    else p.set(param, value);
    const s = p.toString();
    return s ? `/people?${s}` : '/people';
  };

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="h-5 w-5" /> People
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} builder{filtered.length === 1 ? '' : 's'} on the network.
        </p>
      </header>

      <form action="/people" method="GET" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Search by name, skill, location…"
          className="flex-1"
        />
        {type ? <input type="hidden" name="type" value={type} /> : null}
        {remote ? <input type="hidden" name="remote" value={remote} /> : null}
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          Search
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Type</span>
        {(USER_TYPES as readonly string[]).map((t) => (
          <Chip key={t} href={buildHref('type', type === t ? null : t)} active={type === t} label={USER_TYPE_LABELS[t as UserType]} />
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Remote</span>
        {(REMOTE_MODES as readonly string[]).map((r) => (
          <Chip key={r} href={buildHref('remote', remote === r ? null : r)} active={remote === r} label={REMOTE_MODE_LABELS[r as RemoteMode]} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching builders"
          description="Try clearing filters or searching by a different skill."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="group transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <Link href={`/people/${c.username}`} className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    {c.avatarUrl ? <AvatarImage src={c.avatarUrl} /> : null}
                    <AvatarFallback name={c.displayName} />
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{c.displayName}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">L{c.builderLevel}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">@{c.username}</p>
                    {c.headline ? (
                      <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{c.headline}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      {c.userType ? (
                        <Badge variant="muted" className="text-[10px]">{USER_TYPE_LABELS[c.userType as UserType]}</Badge>
                      ) : null}
                      {c.location ? (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {c.location}
                        </span>
                      ) : null}
                      {c.institution ? (
                        <span className="flex items-center gap-0.5">
                          <GraduationCap className="h-2.5 w-2.5" /> {c.institution}
                        </span>
                      ) : null}
                    </div>
                    {c.skills.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.skills.slice(0, 4).map((s) => (
                          <Badge key={s} variant="muted" className="text-[10px]">{s}</Badge>
                        ))}
                        {c.skills.length > 4 ? (
                          <span className="text-[10px] text-muted-foreground">+{c.skills.length - 4}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                      <span>Reputation: {c.reputationScore}</span>
                      <span>{c.projectCount} project{c.projectCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}
