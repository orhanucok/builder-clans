'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sparkles, ArrowRight, Compass, Users, Rocket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'bc-welcome-dismissed';

export function WelcomeBanner() {
  // Read from localStorage; fall back to visible. The component is rendered
  // only on the server with a default-visible state, so SSR doesn't crash.
  const [dismissed, setDismissed] = useState(false);
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) {
        if (!dismissed) setDismissed(true);
      }
    } catch { /* localStorage disabled */ }
  }

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch { /* */ }
  }

  return (
    <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-background to-trial/5">
      <div className="container-wide py-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Welcome to Builder Clans.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Finish your profile so the matcher can suggest relevant projects and people.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="h-7 text-xs">
                <Link href="/onboarding">
                  Finish profile <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link href="/discover">
                  <Compass className="h-3 w-3" /> Browse projects
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href="/people">
                  <Users className="h-3 w-3" /> Find people
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href="/projects/new">
                  <Rocket className="h-3 w-3" /> Start a project
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
