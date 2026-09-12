'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  USER_TYPES,
  USER_TYPE_LABELS,
  WEEKLY_HOURS_BUCKETS,
  WEEKLY_HOURS_LABELS,
  type UserType,
  type WeeklyHoursBucket,
} from '@/config/constants';
import { completeOnboardingAction } from './actions';
import { useToast } from '@/components/ui/toaster';

interface OnboardingFlowProps {
  initialDisplayName: string;
  initialUsername: string;
}

const SUGGESTED_SKILLS = [
  'Python',
  'TypeScript',
  'React',
  'Next.js',
  'PyTorch',
  'Computer Vision',
  'Machine Learning',
  'Medical Imaging',
  'Robotics',
  'ROS',
  'Embedded Systems',
  'Product Design',
  'Figma',
  'Node.js',
  'PostgreSQL',
  'Supabase',
  'Mechanical Design',
  'CAD',
  'NLP',
  'TensorFlow',
];

const SUGGESTED_INTERESTS = [
  'Healthcare AI',
  'Robotics',
  'Developer Tools',
  'Open Source',
  'Climate',
  'Education',
  'Biotech',
  'Indie Hacking',
  'Research',
  'Gaming',
  'Hardware',
  'Cybersecurity',
  'Computer Vision',
  'NLP',
  'Data Engineering',
  'Fintech',
];

export function OnboardingFlow({ initialDisplayName, initialUsername }: OnboardingFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [customSkill, setCustomSkill] = useState('');
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [data, setData] = useState({
    userType: '' as UserType | '',
    displayName: initialDisplayName,
    headline: '',
    bio: '',
    institution: '',
    location: '',
    countryCode: '',
    weeklyHours: '' as WeeklyHoursBucket | '',
    skills: [] as string[],
    interests: [] as string[],
    goal: 'BOTH' as 'BUILD_MY_PROJECT' | 'JOIN_A_PROJECT' | 'BOTH' | 'EXPLORE',
  });

  const totalSteps = 6;

  function next() {
    if (step < totalSteps - 1) setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }
  function toggle(list: 'skills' | 'interests', v: string) {
    setData((d) => {
      const cur = d[list];
      const has = cur.includes(v);
      const next = has ? cur.filter((x) => x !== v) : [...cur, v];
      // Skill cap: 10
      if (list === 'skills' && next.length > 10) return d;
      return { ...d, [list]: next };
    });
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return Boolean(data.userType);
      case 1:
        return data.displayName.trim().length >= 2;
      case 2:
        return data.skills.length >= 1 && data.skills.length <= 10;
      case 3:
        return true; // interests optional
      case 4:
        return Boolean(data.weeklyHours);
      case 5:
        return true;
      default:
        return true;
    }
  }

  const filteredSkillSuggestions = customSkill
    ? Array.from(
        new Set([...SUGGESTED_SKILLS, ...(CANONICAL_SKILLS as readonly string[])]),
      )
        .filter(
          (s) =>
            s.toLowerCase().includes(customSkill.toLowerCase()) &&
            !data.skills.includes(s),
        )
    : [];

  function submit() {
    if (!data.userType || !data.weeklyHours) {
      toast({ title: 'Please complete all steps', variant: 'error' });
      return;
    }
    startTransition(async () => {
      const res = await completeOnboardingAction({
        userType: data.userType as UserType,
        displayName: data.displayName,
        headline: data.headline,
        bio: data.bio,
        institution: data.institution,
        location: data.location,
        countryCode: data.countryCode,
        weeklyHours: data.weeklyHours as WeeklyHoursBucket,
        skills: data.skills,
        interests: data.interests,
        goal: data.goal,
      });
      if (!res?.ok) {
        toast({ title: 'Could not save', description: res?.error, variant: 'error' });
        return;
      }
      toast({ title: 'Profile complete', variant: 'success' });
      router.refresh();
    });
  }

  return (
    <div className="container-narrow py-10">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Step {step + 1} of {totalSteps}</span>
        <div className="flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-foreground transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{TITLES[step]}</CardTitle>
          <CardDescription>{SUBTITLES[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {USER_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setData({ ...data, userType: t })}
                  className={cn(
                    'rounded-lg border border-border bg-background p-3 text-sm font-medium transition-colors hover:bg-accent',
                    data.userType === t && 'border-foreground bg-foreground/5',
                  )}
                >
                  {USER_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={data.displayName}
                  onChange={(e) => setData({ ...data, displayName: e.target.value })}
                  className="mt-1"
                  maxLength={60}
                />
              </div>
              <div>
                <Label htmlFor="headline">Headline (optional)</Label>
                <Input
                  id="headline"
                  placeholder="e.g. CS student Â· Loves medical imaging"
                  value={data.headline}
                  onChange={(e) => setData({ ...data, headline: e.target.value })}
                  className="mt-1"
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="bio">Short bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="What are you building? What do you want to learn?"
                  value={data.bio}
                  onChange={(e) => setData({ ...data, bio: e.target.value })}
                  className="mt-1"
                  maxLength={600}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="institution">Institution (optional)</Label>
                  <Input
                    id="institution"
                    placeholder="University, lab, companyâ€¦"
                    value={data.institution}
                    onChange={(e) => setData({ ...data, institution: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    placeholder="City, country"
                    value={data.location}
                    onChange={(e) => setData({ ...data, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pick up to 10 skills. These power your match scores.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.map((s) => {
                  const selected = data.skills.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggle('skills', s)}
                      className={cn(
                        'rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent',
                        selected && 'border-foreground bg-foreground/5 text-foreground',
                      )}
                    >
                      {selected && <Check className="mr-1 inline h-3 w-3" />}
                      {s}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Search or add a custom skillâ€¦"
                    value={customSkill}
                    onChange={(e) => {
                      setCustomSkill(e.target.value);
                      setSkillPickerOpen(true);
                    }}
                    onFocus={() => setSkillPickerOpen(true)}
                    onBlur={() => setTimeout(() => setSkillPickerOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = customSkill.trim();
                        if (v) {
                          toggle('skills', v);
                          setCustomSkill('');
                          setSkillPickerOpen(false);
                        }
                      } else if (e.key === 'Escape') {
                        setSkillPickerOpen(false);
                      }
                    }}
                  />
                  {skillPickerOpen && customSkill ? (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                      {filteredSkillSuggestions.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">
                          Press Enter to add <strong>{customSkill.trim()}</strong>
                        </div>
                      ) : (
                        filteredSkillSuggestions.slice(0, 6).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              toggle('skills', s);
                              setCustomSkill('');
                            }}
                            className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          >
                            <span>{s}</span>
                            {data.skills.includes(s) ? (
                              <span className="text-[10px] text-muted-foreground">added</span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Selected: {data.skills.length}/10</span>
                  {data.skills.length === 0 && <span>Pick at least one.</span>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pick what you want to build. We use these to suggest projects.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_INTERESTS.map((s) => {
                  const selected = data.interests.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggle('interests', s)}
                      className={cn(
                        'rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent',
                        selected && 'border-foreground bg-foreground/5 text-foreground',
                      )}
                    >
                      {selected && <Check className="mr-1 inline h-3 w-3" />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEEKLY_HOURS_BUCKETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setData({ ...data, weeklyHours: b })}
                  className={cn(
                    'rounded-lg border border-border bg-background p-3 text-sm font-medium transition-colors hover:bg-accent',
                    data.weeklyHours === b && 'border-foreground bg-foreground/5',
                  )}
                >
                  {WEEKLY_HOURS_LABELS[b]}
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['BUILD_MY_PROJECT', 'JOIN_A_PROJECT', 'BOTH', 'EXPLORE'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setData({ ...data, goal: g })}
                  className={cn(
                    'rounded-lg border border-border bg-background p-3 text-sm font-medium transition-colors hover:bg-accent',
                    data.goal === g && 'border-foreground bg-foreground/5',
                  )}
                >
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={prev} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {step < totalSteps - 1 ? (
            <Button variant="ghost" onClick={() => router.push('/discover')}>
              Skip for now
            </Button>
          ) : null}
          {step < totalSteps - 1 ? (
            <Button onClick={next} disabled={!canProceed()}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={pending} disabled={!canProceed()}>
              Finish <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Signed in as <Badge variant="muted">@{initialUsername}</Badge>
        <span className="mx-2">Â·</span>
        <span>Step {step + 1} of {totalSteps}</span>
      </p>
    </div>
  );
}

const TITLES = [
  'Who are you?',
  'A bit about you',
  'What can you do?',
  'What do you want to build?',
  'How much time can you give?',
  'What brings you here?',
];

const SUBTITLES = [
  'We tailor the experience to your background.',
  'Visible on your profile. You can edit later.',
  'These power the matching engine.',
  'Optional. Pick a few â€” we use them to suggest projects.',
  'Honest answer is fine. You can change it anytime.',
  'Last step. Then we ship you to the projects.',
];

const GOAL_LABELS = {
  BUILD_MY_PROJECT: 'Build my project',
  JOIN_A_PROJECT: 'Join a project',
  BOTH: 'Both',
  EXPLORE: 'Just exploring',
} as const;
