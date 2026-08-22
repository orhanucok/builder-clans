import { NewProjectForm } from './new-project-form';
import { isSupabaseConfigured } from '@/lib/env';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = { title: 'New project' };

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-narrow py-10 text-sm text-muted-foreground">
        Configure Supabase to create real projects.
      </div>
    );
  }
  const me = await getCurrentUser();
  if (!me) redirect('/login?returnTo=/projects/new');
  return (
    <div className="container-narrow py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Start a project</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Project-first. We&apos;ll turn this into a real workspace once it&apos;s created.
      </p>
      <div className="mt-8">
        <NewProjectForm />
      </div>
    </div>
  );
}
