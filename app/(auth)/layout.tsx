import Link from 'next/link';
import { Hammer } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(50%_50%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)]"
      />
      <div className="container-narrow flex min-h-screen flex-col items-stretch py-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
            <Hammer className="h-4 w-4" />
          </span>
          Builder Clans
        </Link>
        <div className="mt-10 flex flex-1 items-center justify-center">{children}</div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          The network where the world builds.
        </p>
      </div>
    </main>
  );
}
