import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { levelProgress, publicReputationLabel } from '@/config/gamification';
import { formatRelative } from '@/lib/utils';

interface MemberRow {
  user_id: string;
  member_type: 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR';
  display_name: string;
  username: string;
  avatar_url: string | null;
  builder_level: number;
  builder_xp: number;
  reputation: number;
  joined_at: string;
}

interface MembersTabProps {
  owner: MemberRow;
  members: MemberRow[];
}

export function MembersTab({ owner, members }: MembersTabProps) {
  const all = [owner, ...members].filter(
    (m, i, arr) => arr.findIndex((x) => x.user_id === m.user_id) === i,
  );
  return (
    <div className="space-y-2">
      {all.map((m) => {
        const level = levelProgress(m.builder_xp);
        return (
          <Card key={m.user_id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar className="h-10 w-10">
                {m.avatar_url ? <AvatarImage src={m.avatar_url} /> : null}
                <AvatarFallback name={m.display_name} />
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/people/${m.username}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {m.display_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Level {level.current} · {publicReputationLabel(m.reputation)} ·{' '}
                  {m.builder_xp.toLocaleString()} XP · joined {formatRelative(m.joined_at)}
                </p>
              </div>
              <Badge variant={m.member_type === 'OWNER' ? 'ship' : 'muted'}>{m.member_type}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
