import Link from 'next/link';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { isFeatureEnabled } from '@/config/feature-flags';

export const metadata = { title: 'Clans' };

export default function ClansPage() {
  const enabled = isFeatureEnabled('CLANS');
  return (
    <div className="container-wide py-10">
      {enabled ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Clans (beta)"
          description="Clans are coming. They will sit above projects as community, leaderboard, and challenge layers — never replacing them."
        />
      ) : (
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
      )}
    </div>
  );
}
