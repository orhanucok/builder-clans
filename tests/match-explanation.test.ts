import { describe, it, expect } from 'vitest';
import { generateMatchExplanation } from '@/lib/matching/explanation';

describe('generateMatchExplanation', () => {
  const baseBreakdown = {
    skill: 80,
    interest: 70,
    role: 60,
    availability: 75,
    commitment: 75,
    experience: 50,
    location: 90,
    reputation: 80,
    final: 75,
  };
  const baseCandidate = {
    displayName: 'Sarah Chen',
    skills: ['Python', 'PyTorch', 'Computer Vision'],
    interests: ['Healthcare AI', 'Robotics'],
    availability: '5_TO_10' as const,
    remotePreference: 'REMOTE' as const,
    reputation: 80,
  };
  const baseProject = {
    title: 'Lung CT AI',
    category: 'HEALTHCARE',
    remoteMode: 'REMOTE',
    commitmentMin: 5,
    commitmentMax: 10,
  };

  it('returns a summary', () => {
    const e = generateMatchExplanation(baseBreakdown, baseCandidate, baseProject);
    expect(e.summary).toMatch(/Sarah Chen/);
    expect(e.summary).toMatch(/Lung CT AI/);
  });

  it('produces a list of positives for a strong match', () => {
    const e = generateMatchExplanation(baseBreakdown, baseCandidate, baseProject);
    expect(e.positives.length).toBeGreaterThan(0);
  });

  it('produces concerns for low overlap', () => {
    const weak = {
      ...baseBreakdown,
      skill: 10,
      availability: 10,
      location: 20,
      final: 25,
    };
    const e = generateMatchExplanation(weak, baseCandidate, baseProject);
    expect(e.concerns.length).toBeGreaterThan(0);
  });

  it('returns the score in the result', () => {
    const e = generateMatchExplanation(baseBreakdown, baseCandidate, baseProject);
    expect(e.score).toBe(75);
  });
});
