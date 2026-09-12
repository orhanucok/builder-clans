import { CardGridSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-wide py-8">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
