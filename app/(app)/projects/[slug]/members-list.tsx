import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelative } from '@/lib/utils';

interface MemberProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  reputation_score: number | null;
  builder_xp: number | null;
  builder_level: number | null;
  member_type: string;
  role_title: string | null;
  joined_at: string | null;
}

export function MembersList({
  owner,
  members,
}: {
  owner: MemberProfile | null;
  members: MemberProfile[];
}) {
  if (!owner) {
    return <p className="text-sm text-muted-foreground">No members yet.</p>;
  }
  const all = [owner, ...members];
  return (
    <div className="space-y-2">
      {all.map((m) => (
        <Card key={m.id}>
          <CardContent className="flex items-center gap-3 p-4">
            <Avatar className="h-9 w-9">
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
              {m.headline ? (
                <p className="truncate text-xs text-muted-foreground">{m.headline}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={m.member_type === 'OWNER' ? 'ship' : 'muted'}>
                {m.member_type}
              </Badge>
              {m.joined_at ? (
                <span className="text-[10px] text-muted-foreground">
                  joined {formatRelative(m.joined_at)}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
