import { RowListSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-wide py-8">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted/70" />
      </div>
      <RowListSkeleton count={6} />
    </div>
  );
}
