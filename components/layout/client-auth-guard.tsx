'use client';

/**
 * ClientAuthGuard — redirects unauthenticated users to /login and pushes the
 * user back to the originally requested URL once they sign in.
 *
 * Lives as a wrapper component rather than middleware because static export
 * has no per-request runtime.
 */

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentClientUser } from '@/lib/auth/demo';

export function ClientAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const user = getCurrentClientUser();
    if (!user) {
      const target = pathname && pathname !== '/login' ? `/login?returnTo=${encodeURIComponent(pathname)}` : '/login';
      router.replace(target);
      return;
    }
    setReady(true);
  }, [pathname, router]);
  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }
  return <>{children}</>;
}
