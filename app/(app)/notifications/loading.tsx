import { RowListSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-wide py-8">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <RowListSkeleton count={8} />
    </div>
  );
}
