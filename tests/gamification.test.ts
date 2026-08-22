import { describe, it, expect } from 'vitest';
import {
  xpToReachLevel,
  levelFromXp,
  levelProgress,
  publicReputationLabel,
  XP_REWARDS,
  DAILY_LOGIN_XP_CAP_PER_30_DAYS,
  REPUTATION,
} from '@/config/gamification';

describe('XP level curve', () => {
  it('L1 is 0 XP', () => {
    expect(xpToReachLevel(1)).toBe(0);
  });
  it('L2 is 100', () => {
    expect(xpToReachLevel(2)).toBe(100);
  });
  it('L5 is 900', () => {
    expect(xpToReachLevel(5)).toBe(900);
  });
  it('L10 is 5000', () => {
    expect(xpToReachLevel(10)).toBe(5000);
  });
  it('levelFromXp returns 1 for 0', () => {
    expect(levelFromXp(0)).toBe(1);
  });
  it('levelFromXp returns correct level for mid XP', () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(500)).toBe(4);
  });
  it('levelFromXp caps at maximum defined', () => {
    // Even very large XP returns the maximum level that we know about
    const lvl = levelFromXp(100_000);
    expect(lvl).toBeGreaterThan(20);
  });
  it('levelProgress gives progress 0..1', () => {
    const p = levelProgress(0);
    expect(p.current).toBe(1);
    expect(p.progress).toBe(0);
    const p2 = levelProgress(xpToReachLevel(3) + 50);
    expect(p2.current).toBe(3);
    expect(p2.progress).toBeGreaterThan(0);
  });
});

describe('XP rewards', () => {
  it('every event has a reward', () => {
    expect(XP_REWARDS.PROJECT_SHIPPED).toBe(500);
    expect(XP_REWARDS.SUCCESSFUL_COLLABORATION).toBe(100);
    expect(XP_REWARDS.PROFILE_COMPLETE).toBe(20);
  });
  it('daily-login cap is positive', () => {
    expect(DAILY_LOGIN_XP_CAP_PER_30_DAYS).toBeGreaterThan(0);
  });
});

describe('Reputation', () => {
  it('initial is 50', () => {
    expect(REPUTATION.INITIAL).toBe(50);
  });
  it('min and max are enforced', () => {
    expect(REPUTATION.MIN).toBe(0);
    expect(REPUTATION.MAX).toBe(100);
  });
  it('public labels map correctly', () => {
    expect(publicReputationLabel(0)).toBe('New');
    expect(publicReputationLabel(50)).toBe('Building Trust');
    expect(publicReputationLabel(70)).toBe('Reliable');
    expect(publicReputationLabel(80)).toBe('Highly Reliable');
    expect(publicReputationLabel(95)).toBe('Top Builder');
  });
  it('smoothing prior is set', () => {
    expect(REPUTATION.SMOOTHING_PRIOR_WEIGHT).toBeGreaterThan(0);
  });
});
