import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="container-wide grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <Spinner size="lg" />
        <span>Finding projects for you…</span>
      </div>
    </div>
  );
}
