import Link from 'next/link';
import { Compass, Hammer, Search, Home, ArrowLeft, Users, Bookmark } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export const metadata = { title: 'Not found' };

const QUICK_LINKS = [
  { href: '/discover', label: 'Discover projects', icon: Compass },
  { href: '/people', label: 'Find people', icon: Users },
  { href: '/saved', label: 'Your saved', icon: Bookmark },
  { href: '/activity', label: 'Recent activity', icon: Search },
];

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container-narrow grid min-h-screen place-items-center py-10">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <Hammer className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">404</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Not found.</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Maybe the project is still being built, or the link is from an older version. Try one of these instead.
            </p>
          </div>

          <form action="/search" method="GET" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search projects or peopleâ€¦"
                className="pl-8"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Search
            </button>
          </form>

          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm transition-colors hover:border-foreground/30 hover:bg-accent"
              >
                <l.icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{l.label}</span>
                <ArrowLeft className="ml-auto h-3.5 w-3.5 rotate-180 text-muted-foreground" />
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Home className="h-3 w-3" />
              Or go back to the home page
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
