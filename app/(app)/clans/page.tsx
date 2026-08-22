import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { isFeatureEnabled } from '@/config/feature-flags';
import { ensureSeeded } from '@/lib/db/store';
import { listClans, getClanBySlug, listClanMembers } from '@/lib/db/store/queries';
import { CLAN_TYPE_LABELS, type ClanType } from '@/config/constants';
import { db } from '@/lib/db/store';

export const metadata = { title: 'Clans' };
export const dynamic = 'force-dynamic';

export default async function ClansPage() {
  await ensureSeeded();
  const enabled = isFeatureEnabled('CLANS');
  if (!enabled) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Clans are not enabled in this environment"
          description="Set FEATURE_CLANS=true in your environment to preview the clan shell."
          action={
            <Button asChild variant="outline">
              <Link href="/discover">Back to discover</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const clans = listClans();

  return (
    <div className="container-wide py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Clans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Communities above projects. Local chapters, topic collectives, alumni groups.
        </p>
      </header>
      {clans.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No clans yet"
          description="Clans are coming. They will sit above projects as community, leaderboard, and challenge layers — never replacing them."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clans.map((c) => {
            const members = listClanMembers(c.id);
            const owner = db.profiles.get(c.owner_id);
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="muted">{CLAN_TYPE_LABELS[c.type as ClanType] ?? c.type}</Badge>
                        {c.institution ? <span>· {c.institution}</span> : null}
                        {c.country_code ? <span>· {c.country_code}</span> : null}
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">{c.lifetime_xp.toLocaleString()} XP</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  ) : null}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{members.length} members</span>
                    {owner ? <span>Led by {owner.display_name}</span> : null}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/clans/${c.slug}`}>
                      View clan <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
