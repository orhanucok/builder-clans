import Link from 'next/link';
import { Users, MapPin, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_STAGE_LABELS,
  REMOTE_MODE_LABELS,
  type ProjectCategory,
  type ProjectStage,
  type RemoteMode,
} from '@/config/constants';
import { cn } from '@/lib/utils';

export interface ProjectCardData {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: ProjectCategory;
  stage: ProjectStage;
  remoteMode: RemoteMode;
  location: string | null;
  weeklyCommitmentMin: number;
  weeklyCommitmentMax: number;
  owner: { displayName: string; username: string; avatarUrl: string | null };
  memberCount: number;
  openRoleCount: number;
  openRoleTitles: string[];
  tags: string[];
  matchScore?: number;
  lookingFor?: string[];
}

export function ProjectCard({ data }: { data: ProjectCardData }) {
  return (
    <Card className="group h-full transition-shadow hover:border-border hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="muted">{PROJECT_CATEGORY_LABELS[data.category]}</Badge>
              <Badge variant="outline">{PROJECT_STAGE_LABELS[data.stage]}</Badge>
            </div>
            <CardTitle className="mt-2 text-lg">
              <Link href={`/projects/${data.slug}`} className="hover:underline">
                {data.title}
              </Link>
            </CardTitle>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {data.shortDescription}
            </p>
          </div>
          {data.matchScore != null && (
            <div className="flex shrink-0 flex-col items-end">
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums',
                  data.matchScore >= 80
                    ? 'text-ship'
                    : data.matchScore >= 60
                      ? 'text-xp'
                      : 'text-muted-foreground',
                )}
              >
                {data.matchScore}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">match</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {data.memberCount} members
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {data.weeklyCommitmentMin}-{data.weeklyCommitmentMax} h/week
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {REMOTE_MODE_LABELS[data.remoteMode]}
            {data.location ? ` · ${data.location}` : null}
          </span>
        </div>

        {data.lookingFor && data.lookingFor.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Looking for
            </span>
            {data.lookingFor.slice(0, 3).map((t) => (
              <Badge key={t} variant="trial" className="text-[10px]">
                {t}
              </Badge>
            ))}
            {data.lookingFor.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{data.lookingFor.length - 3} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {data.owner.avatarUrl ? <AvatarImage src={data.owner.avatarUrl} /> : null}
              <AvatarFallback name={data.owner.displayName} />
            </Avatar>
            <span className="text-xs text-muted-foreground">
              by <span className="font-medium text-foreground">{data.owner.displayName}</span>
            </span>
          </div>
          <Link
            href={`/projects/${data.slug}`}
            className="text-xs font-medium text-foreground hover:underline"
          >
            View project →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
