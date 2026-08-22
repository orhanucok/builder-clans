/**
 * AI features — match explanation, project plan, weekly summary, gap analysis.
 *
 * Each function attempts to use the AI provider. If the provider is `mock`
 * (or the call fails), the function falls back to a *deterministic* template.
 * The product must remain functional with AI disabled (master plan §93).
 */

import { getAiProvider } from './provider';
import { isFeatureEnabled } from '@/config/feature-flags';
import { generateMatchExplanation as deterministicMatchExplanation, type MatchExplanation } from '@/lib/matching/explanation';
import type { MatchBreakdown } from '@/config/matching';

export async function aiMatchExplanation(input: {
  candidate: {
    displayName: string;
    skills: string[];
    interests: string[];
    availability: string | null;
    remotePreference: string | null;
    reputation: number;
  };
  project: {
    title: string;
    category: string;
    remoteMode: string;
    commitmentMin: number;
    commitmentMax: number;
  };
  breakdown: MatchBreakdown;
}): Promise<MatchExplanation> {
  const base = deterministicMatchExplanation(
    input.breakdown,
    input.candidate,
    input.project,
  );

  if (!isFeatureEnabled('AI_FEATURES')) return base;

  try {
    const provider = getAiProvider();
    if (provider.name === 'mock') return base;

    const res = await provider.complete({
      temperature: 0.4,
      maxTokens: 250,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise match analyst. You DO NOT invent scores. Given a deterministic breakdown, write 1 short paragraph and up to 3 bullet points explaining the match. Be specific, factual, no fluff.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            score: base.score,
            summary_seed: base.summary,
            positives: base.positives.map((p) => p.label),
            concerns: base.concerns.map((c) => c.label),
            candidate: input.candidate,
            project: input.project,
          }),
        },
      ],
    });
    // The deterministic version stays authoritative for the score; the AI
    // text replaces the summary. Fallback if AI returned __MOCK__.
    if (res.text.startsWith('__MOCK__')) return base;
    return { ...base, summary: res.text.trim() };
  } catch (err) {
    // Master plan §93: failure must not break the flow.
    // eslint-disable-next-line no-console
    console.warn('[ai] match explanation failed, falling back:', err);
    return base;
  }
}

export interface ProjectPlan {
  title: string;
  problem: string;
  goal: string;
  milestones: Array<{ title: string; description: string }>;
  requiredRoles: Array<{ title: string; skills: string[] }>;
  skills: string[];
  mvp: string;
}

const FALLBACK_PLAN: ProjectPlan = {
  title: '',
  problem: '',
  goal: '',
  milestones: [],
  requiredRoles: [],
  skills: [],
  mvp: '',
};

export async function aiProjectPlanFromDescription(input: {
  title: string;
  description: string;
}): Promise<ProjectPlan> {
  if (!isFeatureEnabled('AI_FEATURES')) return { ...FALLBACK_PLAN, title: input.title };

  try {
    const provider = getAiProvider();
    if (provider.name === 'mock') return { ...FALLBACK_PLAN, title: input.title };
    const res = await provider.complete({
      temperature: 0.3,
      maxTokens: 700,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'You extract a structured project plan from a free-text description. Return strict JSON with keys: title, problem, goal, milestones[{title,description}], requiredRoles[{title,skills[]}], skills[], mvp.',
        },
        {
          role: 'user',
          content: `Title: ${input.title}\n\nDescription:\n${input.description}`,
        },
      ],
    });
    const parsed = JSON.parse(res.text) as ProjectPlan;
    return { ...FALLBACK_PLAN, ...parsed };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[ai] project plan failed:', err);
    return { ...FALLBACK_PLAN, title: input.title };
  }
}

export async function aiWeeklySummary(input: {
  projectTitle: string;
  recentUpdates: Array<{ body: string; createdAt: string }>;
  tasksCompleted: number;
  tasksTotal: number;
  milestones: Array<{ title: string; status: string }>;
}): Promise<string> {
  if (!isFeatureEnabled('AI_FEATURES')) {
    return deterministicWeeklySummary(input);
  }
  try {
    const provider = getAiProvider();
    if (provider.name === 'mock') return deterministicWeeklySummary(input);
    const res = await provider.complete({
      temperature: 0.3,
      maxTokens: 400,
      messages: [
        {
          role: 'system',
          content:
            'You summarize a week of project progress. Be specific, factual, no fluff. Mention numbers, blockers, next steps.',
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
    });
    if (res.text.startsWith('__MOCK__')) return deterministicWeeklySummary(input);
    return res.text.trim();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[ai] weekly summary failed:', err);
    return deterministicWeeklySummary(input);
  }
}

function deterministicWeeklySummary(input: {
  projectTitle: string;
  recentUpdates: Array<{ body: string; createdAt: string }>;
  tasksCompleted: number;
  tasksTotal: number;
  milestones: Array<{ title: string; status: string }>;
}): string {
  const { projectTitle, tasksCompleted, tasksTotal, milestones } = input;
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
  return `Weekly summary for ${projectTitle}\n\n• ${tasksCompleted}/${tasksTotal} tasks completed\n• ${completedMilestones} milestone(s) completed\n• ${input.recentUpdates.length} update(s) posted\n\nNext priorities: continue working through open milestones, post a short update if blocked.`;
}

export interface GapAnalysis {
  currentCapabilities: string[];
  missingCapabilities: string[];
  recommendation: { title: string; skills: string[] } | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function aiGapAnalysis(input: {
  projectDescription: string;
  category: string;
  memberSkills: string[][];
  openRoles: Array<{ title: string; skills: string[] }>;
}): Promise<GapAnalysis> {
  const currentCapabilities = Array.from(new Set(input.memberSkills.flat()));
  const requiredKeywords: Record<string, string> = {
    AI_ML: 'Machine Learning',
    HEALTHCARE: 'Medical Imaging',
    ROBOTICS: 'Robotics',
    DEVELOPER_TOOLS: 'TypeScript',
    SAAS: 'Product Design',
    RESEARCH: 'Research',
  };
  const want = requiredKeywords[input.category];
  const missingCapabilities: string[] = [];
  if (want) {
    const has = currentCapabilities.some(
      (s) => s.toLowerCase().includes(want.toLowerCase().split(' ')[0]!),
    );
    if (!has) missingCapabilities.push(want);
  }
  return {
    currentCapabilities,
    missingCapabilities,
    recommendation:
      missingCapabilities.length > 0
        ? { title: `${missingCapabilities[0]} Collaborator`, skills: missingCapabilities }
        : null,
    confidence: missingCapabilities.length > 0 ? 'MEDIUM' : 'LOW',
  };
}
