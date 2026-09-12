'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';

interface MobileSidebarSheetProps {
  user: { displayName: string; username: string; avatarUrl: string | null } | null;
  flags: { clans: boolean; leaderboard: boolean; nativeChat: boolean };
  savedCount?: number;
  unreadCount?: number;
}

/**
 * Mobile-only navigation drawer. Renders a hamburger button that opens a
 * left-anchored Radix Dialog. Reuses the desktop <Sidebar> for visual
 * consistency so nav structure stays single-source-of-truth.
 */
export function MobileSidebarSheet(props: MobileSidebarSheetProps) {
  const [open, setOpen] = React.useState(false);
  // Close on route change (the Sidebar itself only closes when links are
  // tapped; closing here covers programmatic navigations such as Cmd+K jumps).
  // Pathname is cheap to read so we just track it and close when it changes.
  const lastPathnameRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const tick = () => {
      if (lastPathnameRef.current !== window.location.pathname) {
        lastPathnameRef.current = window.location.pathname;
        if (open) setOpen(false);
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border/60 bg-background shadow-xl md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-200',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Primary site navigation
          </DialogPrimitive.Description>
          <div className="absolute right-3 top-3 z-10">
            <DialogPrimitive.Close
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <Sidebar
            {...props}
            className="!flex !w-full !max-w-none border-0 bg-background"
            onNavigate={() => setOpen(false)}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
