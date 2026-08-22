'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

export function SetupBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
      <div className="container-wide flex items-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Demo mode:</strong> Supabase is not configured. The UI shell works, but data is not
          persisted. Set <code className="rounded bg-background/50 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-background/50 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in
          <code className="rounded bg-background/50 px-1"> .env.local</code> to enable a real backend.
        </span>
        <button
          onClick={() => setOpen(false)}
          className="ml-auto rounded p-0.5 hover:bg-amber-500/20"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
