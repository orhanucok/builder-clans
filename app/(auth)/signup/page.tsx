'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { signUpAction } from '../actions';
import { isSupabaseConfigured } from '@/lib/env';

export default function SignupPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const supabaseReady = isSupabaseConfigured();
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await signUpAction(form);
      if (!res.ok) {
        toast({ title: 'Sign up failed', description: res.error, variant: 'error' });
        if (res.fieldErrors) setErrors(res.fieldErrors);
        return;
      }
      toast({ title: 'Account created', description: 'Welcome to Builder Clans.', variant: 'success' });
      router.push('/onboarding');
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your builder profile</CardTitle>
        <CardDescription>It takes a minute. We&apos;ll set up the rest.</CardDescription>
      </CardHeader>
      <CardContent>
        {!supabaseReady && (
          <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <strong>Demo mode:</strong> Supabase is not configured. Add credentials to{' '}
            <code className="rounded bg-muted px-1">.env.local</code> to enable sign up.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              required
              minLength={2}
              maxLength={60}
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1"
              invalid={!!errors.displayName}
            />
            {errors.displayName && <p className="mt-1 text-xs text-destructive">{errors.displayName}</p>}
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              required
              minLength={3}
              maxLength={32}
              pattern="^[a-z0-9_-]+$"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              className="mt-1"
              invalid={!!errors.username}
            />
            <p className="mt-1 text-xs text-muted-foreground">Letters, numbers, _ and - only.</p>
            {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username}</p>}
          </div>
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
              invalid={!!errors.email}
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1"
              invalid={!!errors.password}
            />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>
          <Button type="submit" loading={pending} className="w-full" disabled={!supabaseReady}>
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
