'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  PROJECT_CATEGORIES,
  PROJECT_CATEGORY_LABELS,
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  PROJECT_VISIBILITY,
  REMOTE_MODES,
  REMOTE_MODE_LABELS,
} from '@/config/constants';
import { createProjectAction } from '../actions';
import { useToast } from '@/components/ui/toaster';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SKILL_SUGGESTIONS = [
  'Python',
  'TypeScript',
  'React',
  'PyTorch',
  'Computer Vision',
  'Medical Imaging',
  'Robotics',
  'ROS',
  'Embedded Systems',
  'Figma',
  'Product Design',
  'Node.js',
  'PostgreSQL',
];

export function NewProjectForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [aiBusy, setAiBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: 'AI_ML' as (typeof PROJECT_CATEGORIES)[number],
    stage: 'IDEA' as (typeof PROJECT_STAGES)[number],
    visibility: 'PUBLIC' as (typeof PROJECT_VISIBILITY)[number],
    remoteMode: 'REMOTE' as (typeof REMOTE_MODES)[number],
    location: '',
    weeklyCommitmentMin: 5,
    weeklyCommitmentMax: 10,
    githubUrl: '',
    demoUrl: '',
    websiteUrl: '',
    coverImageUrl: '',
    tags: [] as string[],
    requiredSkills: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addTag(v: string) {
    const t = v.trim();
    if (!t) return;
    if (form.tags.includes(t)) return;
    if (form.tags.length >= 15) return;
    setForm({ ...form, tags: [...form.tags, t] });
  }
  function addSkill(v: string) {
    const s = v.trim();
    if (!s) return;
    if (form.requiredSkills.includes(s)) return;
    if (form.requiredSkills.length >= 15) return;
    setForm({ ...form, requiredSkills: [...form.requiredSkills, s] });
  }
  function removeTag(t: string) {
    setForm({ ...form, tags: form.tags.filter((x) => x !== t) });
  }
  function removeSkill(s: string) {
    setForm({
      ...form,
      requiredSkills: form.requiredSkills.filter((x) => x !== s),
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (form.weeklyCommitmentMin > form.weeklyCommitmentMax) {
      setErrors({ commitment: 'Min cannot exceed max.' });
      return;
    }
    startTransition(async () => {
      const res = await createProjectAction(form);
      if (res && !res.ok) {
        toast({ title: 'Could not create project', description: res.error, variant: 'error' });
        if (res.fieldErrors) setErrors(res.fieldErrors);
        return;
      }
      toast({ title: 'Project created', variant: 'success' });
      // Server action will redirect
      router.refresh();
    });
  }

  // AI assist: ask the provider to suggest structure. Falls back gracefully.
  async function aiAssist() {
    if (!form.title && !form.description) {
      toast({ title: 'Add a title or description first', variant: 'error' });
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch('/api/ai/project-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      if (!res.ok) {
        toast({ title: 'AI assist unavailable', description: 'Continue manually.', variant: 'error' });
        return;
      }
      const data = await res.json();
      if (data?.plan) {
        const p = data.plan;
        if (p.title && !form.title) update('title', p.title);
        if (p.problem && !form.shortDescription) update('shortDescription', p.problem.slice(0, 160));
        if (p.goal && !form.description) update('description', p.goal);
        if (Array.isArray(p.skills) && p.skills.length) {
          setForm((f) => ({
            ...f,
            requiredSkills: Array.from(new Set([...f.requiredSkills, ...p.skills])).slice(0, 15),
          }));
        }
        toast({ title: 'AI suggestions applied', description: 'Review and adjust as needed.', variant: 'success' });
      }
    } catch {
      toast({ title: 'AI assist failed', description: 'You can fill this in manually.', variant: 'error' });
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Basics</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={aiAssist}
              loading={aiBusy}
              disabled={aiBusy}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI assist
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Cover image (optional)</Label>
            <div className="mt-1.5 flex items-start gap-3">
              <ImageUpload
                value={form.coverImageUrl || null}
                onChange={(url) => update('coverImageUrl', url ?? '')}
                alt={form.title || 'Project cover'}
                shape="banner"
                className="w-full max-w-md"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A cover image makes the project card stand out. 16:9, ~1MB works best.
            </p>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              minLength={3}
              maxLength={80}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="mt-1"
              placeholder="Lung CT AI"
              invalid={!!errors.title}
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="shortDescription">One-liner</Label>
            <Input
              id="shortDescription"
              required
              minLength={10}
              maxLength={160}
              value={form.shortDescription}
              onChange={(e) => update('shortDescription', e.target.value)}
              className="mt-1"
              placeholder="AI model that detects lung nodules from CT scans."
              invalid={!!errors.shortDescription}
            />
            {errors.shortDescription && (
              <p className="mt-1 text-xs text-destructive">{errors.shortDescription}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Full description</Label>
            <Textarea
              id="description"
              required
              minLength={20}
              maxLength={8000}
              rows={8}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="What's the problem? Who's it for? What's the current stage? What kind of help do you need?"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update('category', v as never)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PROJECT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => update('stage', v as never)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team & commitment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Remote</Label>
              <Select value={form.remoteMode} onValueChange={(v) => update('remoteMode', v as never)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMOTE_MODES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REMOTE_MODE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="commitmentMin">Min h/week</Label>
              <Input
                id="commitmentMin"
                type="number"
                min={1}
                max={80}
                value={form.weeklyCommitmentMin}
                onChange={(e) => update('weeklyCommitmentMin', Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="commitmentMax">Max h/week</Label>
              <Input
                id="commitmentMax"
                type="number"
                min={1}
                max={80}
                value={form.weeklyCommitmentMax}
                onChange={(e) => update('weeklyCommitmentMax', Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          {errors.commitment && <p className="text-xs text-destructive">{errors.commitment}</p>}
          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="mt-1"
              placeholder="Istanbul, Turkey"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags & required skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tags</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {form.tags.map((t) => (
                <Badge key={t} variant="muted" className="gap-1 pr-1">
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="rounded p-0.5 hover:bg-foreground/10"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {form.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">No tags yet.</span>
              )}
            </div>
            <Input
              placeholder="Add a tag and press Enter"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
          <div>
            <Label>Required skills</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {form.requiredSkills.map((s) => (
                <Badge key={s} variant="primary" className="gap-1 pr-1">
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="rounded p-0.5 hover:bg-foreground/10"
                    aria-label={`Remove ${s}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {form.requiredSkills.length === 0 && (
                <span className="text-xs text-muted-foreground">No skills yet.</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter((s) => !form.requiredSkills.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className={cn(
                      'rounded-full border border-border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent',
                    )}
                  >
                    + {s}
                  </button>
                ))}
            </div>
            <Input
              placeholder="Add a skill and press Enter"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>GitHub</Label>
            <Input
              type="url"
              value={form.githubUrl}
              onChange={(e) => update('githubUrl', e.target.value)}
              className="mt-1"
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <Label>Demo</Label>
            <Input
              type="url"
              value={form.demoUrl}
              onChange={(e) => update('demoUrl', e.target.value)}
              className="mt-1"
              placeholder="https://demo.example.com"
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              type="url"
              value={form.websiteUrl}
              onChange={(e) => update('websiteUrl', e.target.value)}
              className="mt-1"
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {pending ? 'Creating…' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}
