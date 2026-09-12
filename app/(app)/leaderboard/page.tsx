import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { isFeatureEnabled } from '@/config/feature-flags';

export const metadata = { title: 'Leaderboard' };

export default function LeaderboardPage() {
  const enabled = isFeatureEnabled('LEADERBOARD');
  return (
    <div className="container-wide py-10">
      {enabled ? (
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="Leaderboard (beta)"
          description="Seasons, ranks, and clan competitions come online after the core loop is verified."
        />
      ) : (
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="Leaderboard is not enabled"
          description="Set FEATURE_LEADERBOARD=true to enable the leaderboard shell."
          action={
            <Button asChild variant="outline">
              <Link href="/discover">Back to discover</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
