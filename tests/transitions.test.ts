import { describe, it, expect } from 'vitest';
import { canTransition, StatusMachines } from '@/config/transitions';

describe('trial state machine', () => {
  it('DRAFT can become ACTIVE or ENDED', () => {
    expect(canTransition(StatusMachines.trial, 'DRAFT', 'ACTIVE')).toBe(true);
    expect(canTransition(StatusMachines.trial, 'DRAFT', 'ENDED')).toBe(true);
  });
  it('ACTIVE can become COMPLETED, ENDED, or EXPIRED', () => {
    expect(canTransition(StatusMachines.trial, 'ACTIVE', 'COMPLETED')).toBe(true);
    expect(canTransition(StatusMachines.trial, 'ACTIVE', 'ENDED')).toBe(true);
    expect(canTransition(StatusMachines.trial, 'ACTIVE', 'EXPIRED')).toBe(true);
  });
  it('COMPLETED can become SUCCESSFUL or ENDED', () => {
    expect(canTransition(StatusMachines.trial, 'COMPLETED', 'SUCCESSFUL')).toBe(true);
    expect(canTransition(StatusMachines.trial, 'COMPLETED', 'ENDED')).toBe(true);
  });
  it('SUCCESSFUL is terminal', () => {
    expect(canTransition(StatusMachines.trial, 'SUCCESSFUL', 'ACTIVE')).toBe(false);
    expect(canTransition(StatusMachines.trial, 'SUCCESSFUL', 'ENDED')).toBe(false);
  });
  it('rejects DRAFT → SUCCESSFUL', () => {
    expect(canTransition(StatusMachines.trial, 'DRAFT', 'SUCCESSFUL')).toBe(false);
  });
});

describe('match state machine', () => {
  it('SUGGESTED can be INVITED or APPLIED', () => {
    expect(canTransition(StatusMachines.match, 'SUGGESTED', 'INVITED')).toBe(true);
    expect(canTransition(StatusMachines.match, 'SUGGESTED', 'APPLIED')).toBe(true);
  });
  it('MUTUAL can become TRIAL_STARTED', () => {
    expect(canTransition(StatusMachines.match, 'MUTUAL', 'TRIAL_STARTED')).toBe(true);
  });
  it('MUTUAL cannot become APPLIED', () => {
    expect(canTransition(StatusMachines.match, 'MUTUAL', 'APPLIED')).toBe(false);
  });
  it('DECLINED is terminal', () => {
    expect(canTransition(StatusMachines.match, 'DECLINED', 'MUTUAL')).toBe(false);
  });
});

describe('task state machine', () => {
  it('TODO can move to IN_PROGRESS or BLOCKED', () => {
    expect(canTransition(StatusMachines.task, 'TODO', 'IN_PROGRESS')).toBe(true);
    expect(canTransition(StatusMachines.task, 'TODO', 'BLOCKED')).toBe(true);
  });
  it('IN_PROGRESS can move to DONE or back to TODO', () => {
    expect(canTransition(StatusMachines.task, 'IN_PROGRESS', 'DONE')).toBe(true);
    expect(canTransition(StatusMachines.task, 'IN_PROGRESS', 'TODO')).toBe(true);
  });
  it('DONE is terminal', () => {
    expect(canTransition(StatusMachines.task, 'DONE', 'TODO')).toBe(false);
  });
});

describe('milestone state machine', () => {
  it('PLANNED can become IN_PROGRESS', () => {
    expect(canTransition(StatusMachines.milestone, 'PLANNED', 'IN_PROGRESS')).toBe(true);
  });
  it('IN_PROGRESS can become COMPLETED, BLOCKED, CANCELLED', () => {
    expect(canTransition(StatusMachines.milestone, 'IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransition(StatusMachines.milestone, 'IN_PROGRESS', 'BLOCKED')).toBe(true);
    expect(canTransition(StatusMachines.milestone, 'IN_PROGRESS', 'CANCELLED')).toBe(true);
  });
  it('COMPLETED is terminal', () => {
    expect(canTransition(StatusMachines.milestone, 'COMPLETED', 'IN_PROGRESS')).toBe(false);
  });
});
