import { cn } from '@/lib/utils';

/**
 * Pulse-animated placeholder block. Use to reduce perceived jank during
 * server-data fetching. Pairs well with realistic aspect ratios so layout
 * doesn't shift when content arrives.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      {...props}
    />
  );
}

/**
 * Card-shaped skeleton used by project / profile / match list pages. Gives
 * the user a believable preview while the real cards hydrate.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Row-shaped skeleton used by people list / notification list / saved list.
 */
export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-3 rounded-md border border-border/60 p-3', className)}
    >
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-7 w-16 rounded-md" />
    </div>
  );
}

/**
 * Grid of card skeletons. Default 6 cards in a responsive grid.
 */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List of row skeletons.
 */
export function RowListSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
