'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ExternalLink, Github, Globe, FileText, Database, BookOpen, Video, Palette, Box } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { createArtifactAction } from '../../actions';
import { formatRelative } from '@/lib/utils';
import { ARTIFACT_TYPES, ARTIFACT_TYPE_LABELS, type ArtifactType } from '@/config/constants';

interface ArtifactRow {
  id: string;
  title: string;
  type: ArtifactType;
  url: string;
  description: string | null;
  creator_id: string;
  created_at: string;
}

interface ArtifactsTabProps {
  projectId: string;
  canCreate: boolean;
  artifacts: ArtifactRow[];
}

const ICON_MAP: Record<ArtifactType, React.ComponentType<{ className?: string }>> = {
  GITHUB_REPO: Github,
  DEMO: Box,
  WEBSITE: Globe,
  DOCUMENT: FileText,
  DATASET: Database,
  PAPER: BookOpen,
  VIDEO: Video,
  DESIGN: Palette,
  OTHER: ExternalLink,
};

export function ArtifactsTab({ projectId, canCreate, artifacts }: ArtifactsTabProps) {
  return (
    <div className="space-y-3">
      {canCreate ? (
        <div className="flex justify-end">
          <NewArtifactDialog projectId={projectId} />
        </div>
      ) : null}
      {artifacts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No artifacts yet. Add your repo, demo, paper, or dataset. This is what your proof-of-work
            is built on.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {artifacts.map((a) => {
            const Icon = ICON_MAP[a.type] ?? ExternalLink;
            return (
              <Card key={a.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold hover:underline"
                      >
                        {a.title}
                      </a>
                      <Badge variant="muted" className="text-[10px]">
                        {ARTIFACT_TYPE_LABELS[a.type]}
                      </Badge>
                    </div>
                    {a.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Added {formatRelative(a.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewArtifactDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: '',
    type: 'GITHUB_REPO' as ArtifactType,
    url: '',
    description: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createArtifactAction(projectId, form);
      if (!res.ok) {
        toast({ title: 'Could not add', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Artifact added', variant: 'success' });
      setOpen(false);
      setForm({ title: '', type: 'GITHUB_REPO', url: '', description: '' });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> Add artifact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an artifact</DialogTitle>
          <DialogDescription>Real output. This is what your reputation is built on.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              required
              minLength={1}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as ArtifactType })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARTIFACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ARTIFACT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>URL</Label>
            <Input
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="mt-1"
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
