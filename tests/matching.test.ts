import { describe, it, expect } from 'vitest';
import {
  computeMatchScore,
  normalizeSkill,
  skillScore,
  interestScore,
  availabilityScore,
  locationScore,
  experienceScore,
  roleFitScore,
  reputationScoreNormalized,
  roleTitleToCanonical,
  MATCH_WEIGHT_SUM,
} from '@/config/matching';

describe('matching weights sum to 100', () => {
  it('MATCH_WEIGHT_SUM is 100', () => {
    expect(MATCH_WEIGHT_SUM).toBe(100);
  });
});

describe('normalizeSkill', () => {
  it('resolves ML synonyms', () => {
    expect(normalizeSkill('ML')).toBe('Machine Learning');
    expect(normalizeSkill('ml')).toBe('Machine Learning');
    expect(normalizeSkill('Machine Learning')).toBe('Machine Learning');
  });
  it('resolves CV', () => {
    expect(normalizeSkill('CV')).toBe('Computer Vision');
    expect(normalizeSkill('computer vision')).toBe('Computer Vision');
  });
  it('resolves ROS variants', () => {
    expect(normalizeSkill('ROS2')).toBe('ROS');
    expect(normalizeSkill('ros')).toBe('ROS');
  });
  it('preserves case-insensitive canonical', () => {
    expect(normalizeSkill('react')).toBe('React');
    expect(normalizeSkill('TypeScript')).toBe('TypeScript');
  });
  it('returns null for unknown', () => {
    expect(normalizeSkill('Underwater Basket Weaving')).toBeNull();
    expect(normalizeSkill('')).toBeNull();
  });
});

describe('skillScore', () => {
  it('returns 0.5 when no required skills', () => {
    expect(skillScore([], [])).toBe(0.5);
  });
  it('returns 1.0 when all required skills match', () => {
    expect(skillScore(['Python', 'PyTorch', 'Computer Vision'], ['Python', 'PyTorch'])).toBe(1);
  });
  it('counts partial overlap', () => {
    expect(skillScore(['Python', 'PyTorch'], ['Python', 'PyTorch', 'C++'])).toBeCloseTo(2 / 3, 2);
  });
  it('resolves synonyms', () => {
    expect(skillScore(['ml', 'cv'], ['Machine Learning', 'Computer Vision'])).toBe(1);
  });
});

describe('interestScore', () => {
  it('returns 0.5 when no project tags', () => {
    expect(interestScore(['healthcare'], [])).toBe(0.5);
  });
  it('computes jaccard', () => {
    const score = interestScore(['healthcare', 'ai'], ['healthcare', 'ai', 'robotics']);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('availabilityScore', () => {
  it('returns 0 when no overlap', () => {
    expect(availabilityScore('LESS_THAN_5', [10, 20])).toBe(0);
  });
  it('returns 1 on full overlap', () => {
    expect(availabilityScore('5_TO_10', [5, 10])).toBe(1);
  });
  it('returns 0.5 when candidate missing', () => {
    expect(availabilityScore(null, [5, 10])).toBe(0.5);
  });
});

describe('locationScore', () => {
  it('returns 1 when both remote', () => {
    expect(locationScore('REMOTE', 'REMOTE', false, false)).toBe(1);
  });
  it('returns 0 when on-site + different city', () => {
    expect(locationScore('REMOTE', 'ONSITE', false, false)).toBe(0);
  });
  it('returns 1 for on-site + same city', () => {
    expect(locationScore('ONSITE', 'ONSITE', true, true)).toBe(1);
  });
  it('hybrid gives partial credit', () => {
    expect(locationScore('REMOTE', 'HYBRID', false, false)).toBeCloseTo(0.4, 1);
  });
});

describe('experienceScore', () => {
  it('researcher scores high', () => {
    expect(experienceScore('RESEARCHER')).toBe(0.9);
  });
  it('student scores low', () => {
    expect(experienceScore('STUDENT')).toBe(0.4);
  });
  it('null is neutral', () => {
    expect(experienceScore(null)).toBe(0.5);
  });
});

describe('roleFitScore', () => {
  it('returns 0.5 for unknown titles', () => {
    expect(roleFitScore('Chief Happiness Officer', ['Python'])).toBe(0.5);
  });
  it('matches derived skills', () => {
    const score = roleFitScore('ML Engineer', ['Machine Learning', 'PyTorch']);
    expect(score).toBeGreaterThan(0);
  });
});

describe('roleTitleToCanonical', () => {
  it('extracts multiple skills from a title', () => {
    const skills = roleTitleToCanonical('Computer Vision Engineer');
    expect(skills).toContain('Computer Vision');
  });
  it('handles medical titles', () => {
    const skills = roleTitleToCanonical('Radiology Collaborator');
    expect(skills).toContain('Radiology');
  });
});

describe('reputationScoreNormalized', () => {
  it('clamps to [0,1]', () => {
    expect(reputationScoreNormalized(50)).toBe(0.5);
    expect(reputationScoreNormalized(0)).toBe(0);
    expect(reputationScoreNormalized(100)).toBe(1);
    expect(reputationScoreNormalized(150)).toBe(1);
    expect(reputationScoreNormalized(-10)).toBe(0);
  });
});

describe('computeMatchScore — end to end', () => {
  const baseInput = {
    candidateSkills: ['Python', 'PyTorch', 'Computer Vision', 'Medical Imaging'],
    candidateInterests: ['Healthcare AI', 'Robotics'],
    candidateAvailability: '5_TO_10' as const,
    candidateRemote: 'REMOTE' as const,
    candidateUserType: 'ENGINEER' as const,
    candidateReputation: 75,

    projectRequiredSkills: ['Python', 'PyTorch', 'Medical Imaging'],
    projectTags: ['Healthcare AI', '3D CNN'],
    projectCommitmentMin: 5,
    projectCommitmentMax: 10,
    projectRemote: 'REMOTE' as const,

    roleTitle: 'ML Engineer',
    roleRequiredSkills: [],

    sameCountry: false,
    sameCity: false,
  };
  it('produces a final score between 0 and 100', () => {
    const r = computeMatchScore(baseInput);
    expect(r.final).toBeGreaterThanOrEqual(0);
    expect(r.final).toBeLessThanOrEqual(100);
  });
  it('breakdowns sum to weighted final', () => {
    const r = computeMatchScore(baseInput);
    const expected =
      (r.skill / 100) * 30 +
      (r.interest / 100) * 15 +
      (r.role / 100) * 15 +
      (r.availability / 100) * 15 +
      (r.commitment / 100) * 10 +
      (r.experience / 100) * 5 +
      (r.location / 100) * 5 +
      (r.reputation / 100) * 5;
    expect(r.final).toBe(Math.round(expected));
  });
  it('better overlap yields higher final', () => {
    const strong = computeMatchScore(baseInput);
    const weak = computeMatchScore({
      ...baseInput,
      candidateSkills: ['Cooking'],
      candidateInterests: ['Pottery'],
      candidateReputation: 30,
      candidateUserType: 'OTHER',
    });
    expect(strong.final).toBeGreaterThan(weak.final);
  });
});
