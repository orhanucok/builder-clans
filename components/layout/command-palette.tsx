'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Compass, LayoutGrid, Sparkles, Hammer, Bookmark, Activity,
  Users, Settings, Plus, ArrowRight, LogOut, FileEdit,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { switchPersonaAction } from '@/lib/auth/demo';
import { isSupabaseConfigured } from '@/lib/env';

interface ProjectHit {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  ownerUsername: string;
  ownerDisplayName: string;
}
interface PersonHit {
  id: string;
  username: string;
  displayName: string;
  headline: string | null;
}

type Item =
  | { kind: 'page'; label: string; href: string; icon: React.ReactNode; keywords?: string }
  | { kind: 'action'; label: string; action: () => void; icon: React.ReactNode; keywords?: string }
  | { kind: 'project'; project: ProjectHit; icon: React.ReactNode }
  | { kind: 'person'; person: PersonHit; icon: React.ReactNode };

interface CommandPaletteProps {
  isAuthenticated: boolean;
  isDemo: boolean;
  projects: ProjectHit[];
  people: PersonHit[];
}

const STATIC_PAGES: Array<{ label: string; href: string; icon: React.ReactNode; keywords: string }> = [
  { label: 'Discover projects', href: '/discover', icon: <Compass className="h-4 w-4" />, keywords: 'browse feed for-you new needs' },
  { label: 'My projects', href: '/projects', icon: <LayoutGrid className="h-4 w-4" />, keywords: 'own list' },
  { label: 'Matches', href: '/matches', icon: <Sparkles className="h-4 w-4" />, keywords: 'applicants invitations' },
  { label: 'Trials', href: '/trials', icon: <Hammer className="h-4 w-4" />, keywords: 'sprint collaboration' },
  { label: 'Saved projects', href: '/saved', icon: <Bookmark className="h-4 w-4" />, keywords: 'bookmarks' },
  { label: 'Activity feed', href: '/activity', icon: <Activity className="h-4 w-4" />, keywords: 'recent network' },
  { label: 'People directory', href: '/people', icon: <Users className="h-4 w-4" />, keywords: 'builders directory' },
  { label: 'Search', href: '/search', icon: <Search className="h-4 w-4" />, keywords: 'find projects people' },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" />, keywords: 'profile account preferences' },
  { label: 'New project', href: '/projects/new', icon: <Plus className="h-4 w-4" />, keywords: 'create start' },
];

export function CommandPalette({ isAuthenticated, isDemo, projects, people }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Open with Cmd/Ctrl + K
  useEffect(() => {
    if (!isAuthenticated) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQ('');
        setHighlight(0);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAuthenticated]);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    // Pages
    for (const p of STATIC_PAGES) {
      out.push({ kind: 'page', label: p.label, href: p.href, icon: p.icon, keywords: p.keywords });
    }
    // Demo actions
    if (isDemo) {
      out.push({
        kind: 'action',
        label: 'Switch persona (demo)',
        icon: <FileEdit className="h-4 w-4" />,
        keywords: 'login user demo',
        action: () => {
          startTransition(async () => {
            await switchPersonaAction('defne@builderclans.dev');
            setOpen(false);
            router.push('/discover');
            router.refresh();
          });
        },
      });
    }
    out.push({
      kind: 'action',
      label: 'Sign out',
      icon: <LogOut className="h-4 w-4" />,
      keywords: 'logout',
      action: () => {
        startTransition(async () => {
          try {
            const r = await fetch('/api/auth/signout', { method: 'POST' });
            void r;
          } catch { /* ignore */ }
          setOpen(false);
          // Best-effort: redirect to /login
          window.location.href = '/login';
        });
      },
    });
    // Projects
    for (const proj of projects) {
      out.push({
        kind: 'project',
        project: proj,
        icon: <LayoutGrid className="h-4 w-4" />,
      });
    }
    // People
    for (const p of people) {
      out.push({
        kind: 'person',
        person: p,
        icon: <Users className="h-4 w-4" />,
      });
    }
    return out;
  }, [projects, people, isDemo, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items.slice(0, 8);
    return items
      .map((it) => {
        if (it.kind === 'page' || it.kind === 'action') {
          const blob = `${it.label} ${it.keywords ?? ''}`.toLowerCase();
          return { item: it, score: blob.includes(term) ? 1 : 0 };
        }
        if (it.kind === 'project') {
          const p = it.project;
          const blob = `${p.title} ${p.shortDescription} ${p.ownerDisplayName}`.toLowerCase();
          return { item: it, score: blob.includes(term) ? 1 : 0 };
        }
        const p = it.person;
        const blob = `${p.displayName} ${p.username} ${p.headline ?? ''}`.toLowerCase();
        return { item: it, score: blob.includes(term) ? 1 : 0 };
      })
      .filter((x) => x.score > 0)
      .map((x) => x.item);
  }, [items, q]);

  useEffect(() => {
    setHighlight(0);
  }, [q]);

  if (!isAuthenticated) return null;

  function run(item: Item) {
    setOpen(false);
    setQ('');
    if (item.kind === 'page') {
      router.push(item.href);
    } else if (item.kind === 'project') {
      router.push(`/projects/${item.project.slug}`);
    } else if (item.kind === 'person') {
      router.push(`/people/${item.person.username}`);
    } else {
      item.action();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(filtered.length - 1, h + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(0, h - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const it = filtered[highlight];
                if (it) run(it);
              }
            }}
            placeholder="Search projects, people, or jump to a page…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{q}&rdquo;.
            </div>
          ) : (
            filtered.map((it, i) => (
              <button
                key={`${it.kind}-${i}`}
                type="button"
                onClick={() => run(it)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                  i === highlight ? 'bg-accent text-foreground' : 'text-foreground/90',
                )}
              >
                <span className="text-muted-foreground">{it.icon}</span>
                <span className="min-w-0 flex-1 truncate">
                  {it.kind === 'project' ? (
                    <>
                      <span className="font-medium">{it.project.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        by {it.project.ownerDisplayName}
                      </span>
                    </>
                  ) : it.kind === 'person' ? (
                    <>
                      <span className="font-medium">{it.person.displayName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">@{it.person.username}</span>
                    </>
                  ) : (
                    <span className="font-medium">{it.label}</span>
                  )}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
          <span className="flex items-center gap-2">
            <Kbd>↑</Kbd><Kbd>↓</Kbd> navigate · <Kbd>↵</Kbd> open · <Kbd>esc</Kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
