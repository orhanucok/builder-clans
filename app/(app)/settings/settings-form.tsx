'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/components/ui/toaster';
import { updateProfileAction } from './actions';
import {
  USER_TYPES,
  USER_TYPE_LABELS,
  WEEKLY_HOURS_BUCKETS,
  WEEKLY_HOURS_LABELS,
  type UserType,
  type WeeklyHoursBucket,
} from '@/config/constants';
import { X } from 'lucide-react';

interface ProfileShape {
  display_name: string;
  headline: string | null;
  bio: string | null;
  institution: string | null;
  location: string | null;
  country_code: string | null;
  weekly_hours: string | null;
  user_type: string | null;
  avatar_url: string | null;
}

const SKILL_OPTIONS = [
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
];

const INTEREST_OPTIONS = [
  'Healthcare AI',
  'Robotics',
  'Developer Tools',
  'Open Source',
  'Climate',
  'Education',
  'Biotech',
  'Research',
  'Gaming',
  'Hardware',
];

export function SettingsForm({
  profile,
  skills,
  interests,
}: {
  profile: ProfileShape;
  skills: string[];
  interests: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    displayName: profile.display_name,
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    institution: profile.institution ?? '',
    location: profile.location ?? '',
    countryCode: profile.country_code ?? '',
    weeklyHours: profile.weekly_hours ?? '',
    userType: profile.user_type ?? '',
    avatarUrl: profile.avatar_url ?? '',
    skills,
    interests,
  });

  function toggle(list: 'skills' | 'interests', v: string) {
    setForm((f) => {
      const has = f[list].includes(v);
      return { ...f, [list]: has ? f[list].filter((x) => x !== v) : [...f[list], v] };
    });
  }
  function addCustom(list: 'skills' | 'interests', v: string) {
    const t = v.trim();
    if (!t || form[list].includes(t)) return;
    setForm({ ...form, [list]: [...form[list], t] });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userType || !form.weeklyHours) {
      toast({ title: 'Please pick a user type and weekly hours', variant: 'error' });
      return;
    }
    startTransition(async () => {
      const res = await updateProfileAction({
        userType: form.userType as UserType,
        displayName: form.displayName,
        headline: form.headline,
        bio: form.bio,
        institution: form.institution,
        location: form.location,
        countryCode: form.countryCode,
        weeklyHours: form.weeklyHours as WeeklyHoursBucket,
        avatarUrl: form.avatarUrl,
        skills: form.skills,
        interests: form.interests,
        goal: 'BOTH',
      });
      if (!res.ok) {
        toast({ title: 'Could not save', description: res.error, variant: 'error' });
        return;
      }
      toast({ title: 'Saved', variant: 'success' });
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-4">
        <ImageUpload
          value={form.avatarUrl || null}
          onChange={(url) => setForm({ ...form, avatarUrl: url ?? '' })}
          alt={form.displayName}
          shape="circle"
        />
        <div className="flex-1 space-y-1.5">
          <Label>Profile picture</Label>
          <p className="text-xs text-muted-foreground">
            Drag &amp; drop or click to upload. PNG, JPG, WebP, GIF, or SVG. Max 2 MB.
          </p>
          <p className="text-xs text-muted-foreground">
            Or paste a URL below.
          </p>
          <Input
            value={form.avatarUrl.startsWith('data:') ? '' : form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            className="mt-2"
            placeholder="https://â€¦"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Display name</Label>
          <Input
            required
            minLength={2}
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>User type</Label>
          <Select value={form.userType} onValueChange={(v) => setForm({ ...form, userType: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {USER_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Weekly hours</Label>
          <Select
            value={form.weeklyHours}
            onValueChange={(v) => setForm({ ...form, weeklyHours: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKLY_HOURS_BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {WEEKLY_HOURS_LABELS[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Headline</Label>
        <Input
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="mt-1"
          maxLength={120}
        />
      </div>
      <div>
        <Label>Bio</Label>
        <Textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="mt-1"
          rows={3}
          maxLength={600}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>Institution</Label>
          <Input
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Location</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Country code (2 letters)</Label>
          <Input
            value={form.countryCode}
            onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
            className="mt-1"
            maxLength={2}
          />
        </div>
      </div>

      <div>
        <Label>Skills</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {form.skills.map((s) => (
            <Badge key={s} variant="primary" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => toggle('skills', s)}
                className="rounded p-0.5 hover:bg-foreground/10"
                aria-label={`Remove ${s}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SKILL_OPTIONS.filter((s) => !form.skills.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle('skills', s)}
                className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent"
              >
                + {s}
              </button>
            ))}
        </div>
        <Input
          className="mt-2"
          placeholder="Add a skill and press Enter"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom('skills', (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
      </div>

      <div>
        <Label>Interests</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {form.interests.map((s) => (
            <Badge key={s} variant="trial" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => toggle('interests', s)}
                className="rounded p-0.5 hover:bg-foreground/10"
                aria-label={`Remove ${s}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {INTEREST_OPTIONS.filter((s) => !form.interests.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle('interests', s)}
                className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent"
              >
                + {s}
              </button>
            ))}
        </div>
        <Input
          className="mt-2"
          placeholder="Add an interest and press Enter"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom('interests', (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
