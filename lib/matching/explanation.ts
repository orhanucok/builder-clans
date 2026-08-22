/**
 * Match explanation — generates a human-readable explanation from a
 * deterministic breakdown.
 *
 * Master plan §18: "Score deterministic sistemden gelir. AI sadece explanation
 * text'ini üretebilir. Score AI tarafından uydurulmamalıdır."
 *
 * This module is split into two:
 *  - generateMatchExplanation(): the *deterministic* explanation builder
 *    (always available, no AI required). Used as the default.
 *  - aiGenerateMatchExplanation(): AI narration layered on top. Optional.
 */

import type { MatchBreakdown } from '@/config/matching';

export interface ExplanationItem {
  label: string;
  isPositive: boolean;
}

export interface MatchExplanation {
  summary: string;
  positives: ExplanationItem[];
  concerns: ExplanationItem[];
  score: number;
}

export function generateMatchExplanation(
  breakdown: MatchBreakdown,
  candidate: {
    displayName: string;
    skills: string[];
    interests: string[];
    availability: string | null;
    remotePreference: string | null;
    reputation: number;
  },
  project: {
    title: string;
    category: string;
    remoteMode: string;
    commitmentMin: number;
    commitmentMax: number;
  },
): MatchExplanation {
  const positives: ExplanationItem[] = [];
  const concerns: ExplanationItem[] = [];

  if (breakdown.skill >= 70) {
    positives.push({
      label: `Strong skill overlap (${breakdown.skill}%)`,
      isPositive: true,
    });
  } else if (breakdown.skill < 30) {
    concerns.push({
      label: `Limited skill overlap (${breakdown.skill}%)`,
      isPositive: false,
    });
  }

  if (breakdown.interest >= 60) {
    positives.push({
      label: 'Interests align with project category',
      isPositive: true,
    });
  }

  if (breakdown.availability >= 70) {
    positives.push({
      label: `Availability matches (${breakdown.availability}%)`,
      isPositive: true,
    });
  } else if (breakdown.availability < 30) {
    concerns.push({
      label: 'Availability may not fit the required commitment',
      isPositive: false,
    });
  }

  if (breakdown.location >= 80) {
    positives.push({
      label: `Works well in ${project.remoteMode.toLowerCase()} mode`,
      isPositive: true,
    });
  } else if (breakdown.location < 40) {
    concerns.push({
      label: 'Location/remote fit may be a challenge',
      isPositive: false,
    });
  }

  if (breakdown.reputation >= 75) {
    positives.push({
      label: `High reputation (${candidate.reputation})`,
      isPositive: true,
    });
  } else if (breakdown.reputation < 50) {
    concerns.push({
      label: 'Newer builder — limited track record',
      isPositive: false,
    });
  }

  if (breakdown.role >= 70) {
    positives.push({
      label: 'Background matches the role title',
      isPositive: true,
    });
  }

  const headline =
    breakdown.final >= 85
      ? 'Excellent match'
      : breakdown.final >= 70
        ? 'Strong match'
        : breakdown.final >= 50
          ? 'Decent match'
          : 'Weak match';

  const summary = `${headline} for ${project.title}. ${candidate.displayName}'s profile overlaps on ${breakdown.skill}% of required skills, with ${breakdown.interest}% interest alignment.`;

  return { summary, positives, concerns, score: breakdown.final };
}
