/**
 * Builder Clans — Status Transition Matrix
 *
 * Master plan §112: "status transitions validate edilsin."
 *
 * Every state machine in the product has its allowed transitions declared
 * here. Use canTransition() before mutating.
 */

import type {
  MatchStatus,
  TrialStatus,
  ProjectMemberStatus,
  ApplicationStatus,
  MilestoneStatus,
  TaskStatus,
} from './constants';

type Machine<T extends string> = Record<T, readonly T[]>;

const trialMachine: Machine<TrialStatus> = {
  DRAFT: ['ACTIVE', 'ENDED'],
  ACTIVE: ['COMPLETED', 'ENDED', 'EXPIRED'],
  COMPLETED: ['SUCCESSFUL', 'ENDED'],
  SUCCESSFUL: [],
  ENDED: [],
  EXPIRED: [],
};

const matchMachine: Machine<MatchStatus> = {
  SUGGESTED: ['INVITED', 'APPLIED', 'EXPIRED', 'DECLINED'],
  INVITED: ['MUTUAL', 'DECLINED', 'EXPIRED'],
  APPLIED: ['MUTUAL', 'DECLINED', 'EXPIRED'],
  MUTUAL: ['TRIAL_STARTED', 'DECLINED', 'EXPIRED'],
  DECLINED: [],
  EXPIRED: [],
  TRIAL_STARTED: [],
};

const projectMemberMachine: Machine<ProjectMemberStatus> = {
  ACTIVE: ['LEFT', 'REMOVED'],
  LEFT: [],
  REMOVED: [],
};

const applicationMachine: Machine<ApplicationStatus> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const milestoneMachine: Machine<MilestoneStatus> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const taskMachine: Machine<TaskStatus> = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['DONE', 'BLOCKED', 'TODO'],
  DONE: [],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
};

export function canTransition<T extends string>(
  machine: Machine<T>,
  from: T,
  to: T,
): boolean {
  return machine[from]?.includes(to) ?? false;
}

export const StatusMachines = {
  trial: trialMachine,
  match: matchMachine,
  projectMember: projectMemberMachine,
  application: applicationMachine,
  milestone: milestoneMachine,
  task: taskMachine,
} as const;
