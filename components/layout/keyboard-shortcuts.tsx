'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';


interface Shortcut {
  keys: string[];
  label: string;
  description: string;
  href?: string;
  action?: () => void;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['G'], then: ['D'], label: 'Go to Discover', description: 'Open the project feed', href: '/discover' },
  { keys: ['G'], then: ['M'], label: 'Go to Matches', description: 'Open your matches', href: '/matches' },
  { keys: ['G'], then: ['T'], label: 'Go to Trials', description: 'Open your active trials', href: '/trials' },
  { keys: ['G'], then: ['P'], label: 'Go to Projects', description: 'Open your projects', href: '/projects' },
  { keys: ['G'], then: ['N'], label: 'Go to Notifications', description: 'Open notifications', href: '/notifications' },
  { keys: ['G'], then: ['S'], label: 'Go to Settings', description: 'Open settings', href: '/settings' },
  { keys: ['N'], label: 'New project', description: 'Start a new project', href: '/projects/new' },
  { keys: ['/'], label: 'Search', description: 'Focus the global search bar', action: 'focus-search' },
  { keys: ['?'], label: 'Show shortcuts', description: 'Open this cheat sheet', action: 'show-help' },
  { keys: ['Esc'], label: 'Close', description: 'Close any open dialog or popover', action: 'close' },
];

interface KeyboardShortcutsProps {
  isAuthenticated: boolean;
}

export function KeyboardShortcuts({ isAuthenticated }: KeyboardShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Two-key sequences: 'g' then 'd' etc.
    let pendingPrefix: string | null = null;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;
    const PREFIX_TIMEOUT_MS = 1200;

    function resetPrefix() {
      pendingPrefix = null;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    }

    function focusSearch() {
      const el = document.querySelector<HTMLInputElement>('input[aria-label="Global search"]');
      if (el) {
        el.focus();
        el.select();
        return true;
      }
      return false;
    }

    function navigateIfPossible(href: string) {
      if (pathname === href) return;
      router.push(href);
    }

    function onKey(e: KeyboardEvent) {
      // Ignore key events from inputs / textareas / contentEditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          if (e.key === 'Escape') {
            (target as HTMLElement).blur?.();
          }
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Help shortcut always works
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHelpOpen(true);
        resetPrefix();
        return;
      }
      if (e.key === 'Escape') {
        setHelpOpen(false);
        resetPrefix();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        focusSearch();
        resetPrefix();
        return;
      }

      // Prefix-based: g d, g m, ...
      if (pendingPrefix === 'g') {
        resetPrefix();
        const letter = e.key.toLowerCase();
        const gTarget = SHORTCUTS.find((s) => s.keys[0].toLowerCase() === 'g' && s.then?.[0].toLowerCase() === letter);
        if (gTarget?.href) {
          e.preventDefault();
          navigateIfPossible(gTarget.href);
        }
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        pendingPrefix = 'g';
        prefixTimer = setTimeout(resetPrefix, PREFIX_TIMEOUT_MS);
        return;
      }

      // Single-key: n, /, ?
      const k = e.key.toLowerCase();
      const single = SHORTCUTS.find((s) => s.keys.length === 1 && s.keys[0].toLowerCase() === k);
      if (single?.href) {
        e.preventDefault();
        navigateIfPossible(single.href);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      resetPrefix();
    };
  }, [isAuthenticated, router, pathname]);

  if (!isAuthenticated) return null;

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 text-sm">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 py-1">
              <div>
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.description}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                {s.then ? <><span className="text-xs text-muted-foreground">then</span>{s.then.map((k) => <Kbd key={k}>{k}</Kbd>)}</> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          Press <Kbd>?</Kbd> any time to open this. <Kbd>Esc</Kbd> to close.
        </div>
      </DialogContent>
    </Dialog>
  );
}
