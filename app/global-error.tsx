'use client';

/**
 * Root-level error boundary. Last line of defense for errors that escape
 * the per-route error.tsx (e.g. layout failures).
 */

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              The application crashed
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A fatal error occurred. Reload the page to try again.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Error ID: <code className="font-mono">{error.digest}</code>
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Reload
              </button>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
