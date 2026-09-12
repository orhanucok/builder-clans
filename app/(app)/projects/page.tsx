import Link from 'next/link';
import { Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjects } from '@/lib/db/queries/projects';
import { getCurrentUser } from '@/lib/auth/session';
import { ProjectCard } from '@/components/project/project-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ensureSeeded } from '@/lib/db/store';

export const metadata = { title: 'My projects' };

export default async function MyProjectsPage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-wide py-10">
        <EmptyState
          title="Sign in to see your projects"
          description="Once you create an account, your projects will appear here."
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
      </div>
    );
  }
  const myProjects = await listProjects({ ownerId: user.id, limit: 50 });

  return (
    <div className="container-wide py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects you own or contribute to.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" /> New project
          </Link>
        </Button>
      </header>

      {myProjects.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-10 w-10" />}
          title="No projects yet"
          description="Start your first project to begin finding collaborators and shipping work."
          action={
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" /> Create a project
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {myProjects.map((p) => (
            <ProjectCard key={p.id} data={p} />
          ))}
        </div>
      )}
    </div>
  );
}
