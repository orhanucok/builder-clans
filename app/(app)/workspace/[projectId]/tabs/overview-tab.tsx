import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { levelProgress, publicReputationLabel } from '@/config/gamification';
import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_STAGE_LABELS,
  REMOTE_MODE_LABELS,
  type ProjectCategory,
  type ProjectStage,
  type RemoteMode,
} from '@/config/constants';
import { formatRelative } from '@/lib/utils';

interface MemberSummary {
  user_id: string;
  member_type: 'OWNER' | 'CORE_MEMBER' | 'COLLABORATOR' | 'ADVISOR';
  display_name: string;
  username: string;
  avatar_url: string | null;
  builder_level: number;
  builder_xp: number;
  reputation: number;
}

interface MilestoneSummary {
  id: string;
  title: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  target_date: string | null;
}

interface OverviewTabProps {
  project: Record<string, unknown>;
  members: MemberSummary[];
  milestones: MilestoneSummary[];
  progressPct: number;
  taskDone: number;
  taskTotal: number;
}

export function OverviewTab({
  project,
  members,
  milestones,
  progressPct,
  taskDone,
  taskTotal,
}: OverviewTabProps) {
  const currentMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
  const links = ['github_url', 'demo_url', 'website_url']
    .map((k) => ({ key: k, value: project[k] as string | null }))
    .filter((x) => x.value);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPct} tone="ship" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {taskDone}/{taskTotal} tasks complete
              </span>
              <span>
                {completedMilestones}/{milestones.length} milestones
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current milestone</CardTitle>
          </CardHeader>
          <CardContent>
            {currentMilestone ? (
              <div>
                <p className="font-medium">{currentMilestone.title}</p>
                {currentMilestone.target_date ? (
                  <p className="text-xs text-muted-foreground">
                    Target: {formatRelative(currentMilestone.target_date)}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active milestone.{' '}
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href="../tasks">Create one</Link>
                </Button>
              </p>
            )}
          </CardContent>
        </Card>

        {links.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {links.map((l) => (
                <a
                  key={l.key}
                  href={l.value as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-foreground hover:underline"
                >
                  {l.value}
                </a>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.slice(0, 6).map((m) => {
                const level = levelProgress(m.builder_xp);
                return (
                  <Link
                    key={m.user_id}
                    href={`/people/${m.username}`}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                  >
                    <Avatar className="h-8 w-8">
                      {m.avatar_url ? <AvatarImage src={m.avatar_url} /> : null}
                      <AvatarFallback name={m.display_name} />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Level {level.current} · {publicReputationLabel(m.reputation)}
                      </p>
                    </div>
                    <Badge variant="muted" className="text-[10px]">
                      {m.member_type}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Category" value={PROJECT_CATEGORY_LABELS[project.category as ProjectCategory]} />
            <Row label="Stage" value={PROJECT_STAGE_LABELS[project.stage as ProjectStage]} />
            <Row label="Mode" value={REMOTE_MODE_LABELS[project.remote_mode as RemoteMode]} />
            {project.location ? <Row label="Location" value={project.location as string} /> : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
