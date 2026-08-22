import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Hammer,
  Layers,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Force dynamic so we can use plain <Link> children without Slot issues.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_35%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--ship)/0.15),transparent)] blur-2xl"
      />

      <Header />

      {/* Hero */}
      <section className="container-wide pb-20 pt-24 text-center md:pt-32">
        <Badge variant="muted" className="mx-auto">
          <Sparkles className="mr-1 h-3 w-3" />
          <span>Project-first builder network</span>
        </Badge>
        <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Build ambitious things with the right people.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Find collaborators, test how you work together, and ship projects that prove what you can do.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/discover"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <span>Find a project</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-transparent px-6 text-base font-medium transition-colors hover:bg-accent"
          >
            <span>Start a project</span>
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Free during public beta · No credit card · Built for serious builders
        </p>
      </section>

      {/* Steps */}
      <section className="container-wide py-12">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Layers, title: 'Discover projects', desc: 'See what real builders are working on.' },
            { icon: Users, title: 'Find collaborators', desc: 'Ranked candidates with score breakdowns.' },
            { icon: ShieldCheck, title: 'Test the team', desc: '7-day Trial Sprint before committing.' },
            { icon: MessageSquare, title: 'Build together', desc: 'Tasks, chat, updates, artifacts.' },
            { icon: Rocket, title: 'Ship', desc: 'Turn real work into reputation.' },
            { icon: Hammer, title: 'Earn reputation', desc: 'Proof-of-work beats a CV.' },
          ].map((s) => (
            <Card key={s.title} className="bg-card/60">
              <CardContent className="p-5">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pitch */}
      <section className="container-narrow py-16 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          A LinkedIn profile shows what someone <em>said</em> they did.
        </h2>
        <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-muted-foreground md:text-4xl">
          A Builder profile shows what they <em>actually</em> shipped.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-sm text-muted-foreground">
          Your reputation is the work. Trial a teammate before you commit. Ship or move on. Earn XP for what
          you actually finish.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-ship" /> Deterministic matching
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-ship" /> AI explanations, not AI scores
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-ship" /> Built for shipping
          </span>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="container-wide flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
          <Hammer className="h-4 w-4" />
        </span>
        Builder Clans
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/discover"
          className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Discover
        </Link>
        <Link
          href="/login"
          className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="container-wide border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
      <p>
        Builder Clans · {new Date().getFullYear()} · The network where the world builds.
      </p>
    </footer>
  );
}
