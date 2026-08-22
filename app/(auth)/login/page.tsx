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
import { isSupabaseConfigured } from '@/lib/env';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') ?? '/discover';
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const supabaseReady = isSupabaseConfigured();

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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back. Continue building.</CardDescription>
      </CardHeader>
      <CardContent>
        {!supabaseReady && (
          <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <strong>Demo mode:</strong> Supabase is not configured. Add credentials to{' '}
            <code className="rounded bg-muted px-1">.env.local</code> to enable login.
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
          </div>
          <Button type="submit" loading={pending} className="w-full" disabled={!supabaseReady}>
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
