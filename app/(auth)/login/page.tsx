'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { signInAction } from '../actions';
import { switchPersonaAction } from '@/lib/auth/demo';
import { isSupabaseConfigured } from '@/lib/env';
import { DEMO_PERSONAS } from '@/lib/auth/personas';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') ?? '/discover';
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', password: 'demo1234' });
  const supabaseReady = isSupabaseConfigured();
  const isDemo = !supabaseReady;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await signInAction(form);
      if (!res.ok) {
        toast({ title: 'Sign in failed', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Welcome back', variant: 'success' });
      router.push(returnTo);
      router.refresh();
    });
  }

  function pickPersona(email: string) {
    startTransition(async () => {
      const res = await switchPersonaAction(email);
      if (!res.ok) {
        toast({ title: 'Could not switch persona', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Signed in', description: `Now viewing as ${email}`, variant: 'success' });
      router.push(returnTo);
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back. Continue building.</CardDescription>
      </CardHeader>
      <CardContent>
        {isDemo && (
          <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs">
            <strong className="block text-foreground">Demo mode</strong>
            <p className="mt-1 text-muted-foreground">
              No backend yet — pick a persona to explore the app from their perspective,
              or sign up with your own email.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-1.5">
              {DEMO_PERSONAS.slice(0, 4).map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => pickPersona(p.email)}
                  disabled={pending}
                  className="group flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-xs hover:border-foreground/30 hover:bg-muted/60 disabled:opacity-50"
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground">{p.displayName}</span>
                    <span className="text-muted-foreground">{p.headline}</span>
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground">→</span>
                </button>
              ))}
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">More personas ({DEMO_PERSONAS.length - 4})</summary>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {DEMO_PERSONAS.slice(4).map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => pickPersona(p.email)}
                    disabled={pending}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-left text-xs hover:border-foreground/30 disabled:opacity-50"
                  >
                    <span className="font-medium text-foreground">{p.displayName}</span>
                    <span className="ml-2 text-muted-foreground">{p.headline}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={1}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1"
            />
            {isDemo && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Demo password for any seeded user: <code>demo1234</code>
              </p>
            )}
          </div>
          <Button type="submit" loading={pending} className="w-full">
            {pending ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          New here?{' '}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
