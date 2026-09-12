'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Global error boundary. Catches any uncaught client-side error in the
 * route tree and offers a recovery path without a full page reload.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would push to Sentry / a logging service.
    // eslint-disable-next-line no-console
    console.error('[Builder Clans] Unhandled error:', error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We hit an unexpected error. The team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error.digest ? (
            <p className="rounded-md border border-border bg-muted/40 p-2 text-center text-xs text-muted-foreground">
              Error ID: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}
          {error.message && process.env.NODE_ENV !== 'production' ? (
            <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
              {error.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try again</span>
            </button>
            <Link
              href="/discover"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Back to discover
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
