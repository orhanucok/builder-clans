import Link from 'next/link';
import { Compass, Hammer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Not found' };
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Hammer className="h-6 w-6" />
          </div>
          <CardTitle>404 — Not found</CardTitle>
          <CardDescription>
            We couldn&apos;t find what you were looking for. Maybe the project is still being built.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/discover"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Compass className="h-4 w-4" />
            <span>Browse projects</span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
