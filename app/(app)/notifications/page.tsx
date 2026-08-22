import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/utils';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-10">
        <EmptyState title="Demo mode" description="Configure Supabase to see notifications." />
      </div>
    );
  }
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-narrow py-10">
        <EmptyState
          title="Log in to see your notifications"
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
      </div>
    );
  }
  const supabase = await createServerSupabase();
  const { data: notes } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!notes || notes.length === 0) {
    return (
      <div className="container-narrow py-10">
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="You're all caught up"
          description="When someone applies, invites, or reviews you, it'll show up here."
        />
      </div>
    );
  }

  return (
    <div className="container-narrow py-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Notifications</h1>
      <div className="space-y-2">
        {notes.map((n) => (
          <Card key={n.id} className={n.read_at ? '' : 'border-foreground/20'}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title as string}</p>
                {n.body ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body as string}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelative(n.created_at as string)}
                </p>
              </div>
              {n.link ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={n.link as string}>Open</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
