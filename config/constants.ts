/**
 * Builder Clans — Domain Constants & Enums
 *
 * Source of truth for all enum-like values used in the product.
 * Magic numbers and labels are NOT hard-coded elsewhere.
 *
 * Why: Master plan §112 — "enums merkezi tanımla".
 */

// ---------------------------------------------------------------------------
// User types
// ---------------------------------------------------------------------------

export const USER_TYPES = [
  'STUDENT',
  'RESEARCHER',
  'FOUNDER',
  'ENGINEER',
  'DESIGNER',
  'MEDICAL',
  'OTHER',
] as const;
export type UserType = (typeof USER_TYPES)[number];
export const USER_TYPE_LABELS: Record<UserType, string> = {
  STUDENT: 'Student',
  RESEARCHER: 'Researcher',
  FOUNDER: 'Founder',
  ENGINEER: 'Engineer',
  DESIGNER: 'Designer',
  MEDICAL: 'Medical',
  OTHER: 'Other',
};

// ---------------------------------------------------------------------------
// Project stages
// ---------------------------------------------------------------------------

export const PROJECT_STAGES = [
  'IDEA',
  'VALIDATING',
  'PROTOTYPE',
  'BUILDING',
  'TESTING',
  'LAUNCHED',
  'MAINTAINING',
  'PAUSED',
  'COMPLETED',
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  IDEA: 'Idea',
  VALIDATING: 'Validating',
  PROTOTYPE: 'Prototype',
  BUILDING: 'Building',
  TESTING: 'Testing',
  LAUNCHED: 'Launched',
  MAINTAINING: 'Maintaining',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
};
export const PROJECT_STAGE_TONE: Record<ProjectStage, string> = {
  IDEA: 'chip',
  VALIDATING: 'chip',
  PROTOTYPE: 'chip-primary',
  BUILDING: 'chip-primary',
  TESTING: 'chip-primary',
  LAUNCHED: 'chip-ship',
  MAINTAINING: 'chip-ship',
  PAUSED: 'chip',
  COMPLETED: 'chip-ship',
};

// ---------------------------------------------------------------------------
// Project categories
// ---------------------------------------------------------------------------

export const PROJECT_CATEGORIES = [
  'AI_ML',
  'ROBOTICS',
  'HEALTHCARE',
  'BIOTECHNOLOGY',
  'DEVELOPER_TOOLS',
  'SAAS',
  'CONSUMER',
  'HARDWARE',
  'RESEARCH',
  'CLIMATE',
  'FINTECH',
  'EDUCATION',
  'GAMING',
  'CYBERSECURITY',
  'OTHER',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  AI_ML: 'AI / ML',
  ROBOTICS: 'Robotics',
  HEALTHCARE: 'Healthcare',
  BIOTECHNOLOGY: 'Biotechnology',
  DEVELOPER_TOOLS: 'Developer Tools',
  SAAS: 'SaaS',
  CONSUMER: 'Consumer',
  HARDWARE: 'Hardware',
  RESEARCH: 'Research',
  CLIMATE: 'Climate',
  FINTECH: 'Fintech',
  EDUCATION: 'Education',
  GAMING: 'Gaming',
  CYBERSECURITY: 'Cybersecurity',
  OTHER: 'Other',
};

// ---------------------------------------------------------------------------
// Project visibility
// ---------------------------------------------------------------------------

export const PROJECT_VISIBILITY = ['PUBLIC', 'PRIVATE', 'UNLISTED'] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[number];

// ---------------------------------------------------------------------------
// Remote mode
// ---------------------------------------------------------------------------

export const REMOTE_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type RemoteMode = (typeof REMOTE_MODES)[number];
export const REMOTE_MODE_LABELS: Record<RemoteMode, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
};

// ---------------------------------------------------------------------------
// Weekly hours buckets (matches onboarding slider)
// ---------------------------------------------------------------------------

export const WEEKLY_HOURS_BUCKETS = ['LESS_THAN_5', '5_TO_10', '10_TO_20', '20_PLUS'] as const;
export type WeeklyHoursBucket = (typeof WEEKLY_HOURS_BUCKETS)[number];
export const WEEKLY_HOURS_LABELS: Record<WeeklyHoursBucket, string> = {
  LESS_THAN_5: '<5 h/week',
  '5_TO_10': '5–10 h/week',
  '10_TO_20': '10–20 h/week',
  '20_PLUS': '20+ h/week',
};
export const WEEKLY_HOURS_RANGE: Record<WeeklyHoursBucket, [number, number]> = {
  LESS_THAN_5: [0, 5],
  '5_TO_10': [5, 10],
  '10_TO_20': [10, 20],
  '20_PLUS': [20, 80],
};

// ---------------------------------------------------------------------------
// Project role status
// ---------------------------------------------------------------------------

export const PROJECT_ROLE_STATUS = ['OPEN', 'MATCHING', 'FILLED', 'CLOSED'] as const;
export type ProjectRoleStatus = (typeof PROJECT_ROLE_STATUS)[number];

// ---------------------------------------------------------------------------
// Project member types
// ---------------------------------------------------------------------------

export const PROJECT_MEMBER_TYPES = [
  'OWNER',
  'CORE_MEMBER',
  'COLLABORATOR',
  'ADVISOR',
] as const;
export type ProjectMemberType = (typeof PROJECT_MEMBER_TYPES)[number];

export const PROJECT_MEMBER_STATUS = ['ACTIVE', 'LEFT', 'REMOVED'] as const;
export type ProjectMemberStatus = (typeof PROJECT_MEMBER_STATUS)[number];

// ---------------------------------------------------------------------------
// Application statuses
// ---------------------------------------------------------------------------

export const APPLICATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Match status machine
// ---------------------------------------------------------------------------

export const MATCH_STATUSES = [
  'SUGGESTED',
  'INVITED',
  'APPLIED',
  'MUTUAL',
  'DECLINED',
  'EXPIRED',
  'TRIAL_STARTED',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// ---------------------------------------------------------------------------
// Trial statuses
// ---------------------------------------------------------------------------

export const TRIAL_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'SUCCESSFUL',
  'ENDED',
  'EXPIRED',
] as const;
export type TrialStatus = (typeof TRIAL_STATUSES)[number];

export const TRIAL_DURATIONS = [7, 14] as const;
export type TrialDurationDays = (typeof TRIAL_DURATIONS)[number];

// ---------------------------------------------------------------------------
// Trial reviews
// ---------------------------------------------------------------------------

export const TRIAL_WOULD_WORK_AGAIN = ['YES', 'MAYBE', 'NO'] as const;
export type TrialWouldWorkAgain = (typeof TRIAL_WOULD_WORK_AGAIN)[number];

// ---------------------------------------------------------------------------
// Milestone status
// ---------------------------------------------------------------------------

export const MILESTONE_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'CANCELLED',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Task status
// ---------------------------------------------------------------------------

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ---------------------------------------------------------------------------
// Artifact types
// ---------------------------------------------------------------------------

export const ARTIFACT_TYPES = [
  'GITHUB_REPO',
  'DEMO',
  'WEBSITE',
  'DOCUMENT',
  'DATASET',
  'PAPER',
  'VIDEO',
  'DESIGN',
  'OTHER',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  GITHUB_REPO: 'GitHub repo',
  DEMO: 'Demo',
  WEBSITE: 'Website',
  DOCUMENT: 'Document',
  DATASET: 'Dataset',
  PAPER: 'Paper',
  VIDEO: 'Video',
  DESIGN: 'Design',
  OTHER: 'Other',
};

// ---------------------------------------------------------------------------
// Contribution types
// ---------------------------------------------------------------------------

export const CONTRIBUTION_TYPES = [
  'CODE',
  'DESIGN',
  'RESEARCH',
  'DATA',
  'PRODUCT',
  'HARDWARE',
  'MEDICAL',
  'BUSINESS',
  'DOCUMENTATION',
  'OTHER',
] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

// ---------------------------------------------------------------------------
// Channel / message
// ---------------------------------------------------------------------------

export const CHANNEL_TYPES = ['PROJECT', 'TRIAL', 'CLAN', 'DIRECT'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

// ---------------------------------------------------------------------------
// XP events
// ---------------------------------------------------------------------------

export const XP_EVENT_TYPES = [
  'PROFILE_COMPLETE',
  'FIRST_PROJECT',
  'TRIAL_COMPLETED',
  'SUCCESSFUL_COLLABORATION',
  'MILESTONE_COMPLETED',
  'VERIFIED_CONTRIBUTION',
  'PROJECT_SHIPPED',
  'HELP_ANOTHER_PROJECT',
  'DAILY_LOGIN',
  'REFERRAL_JOINED',
] as const;
export type XpEventType = (typeof XP_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Reputation sources
// ---------------------------------------------------------------------------

export const REPUTATION_SOURCES = [
  'TRIAL_SUCCESS',
  'TRIAL_NO_SHOW',
  'TRIAL_PARTICIPATED',
  'PEER_REVIEW',
  'PROJECT_SHIPPED',
  'COMMITMENT_BREACH',
  'MALICIOUS_REPORT',
  'INITIAL',
] as const;
export type ReputationSource = (typeof REPUTATION_SOURCES)[number];

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  'NEW_APPLICATION',
  'PROJECT_INVITATION',
  'MATCH_ACCEPTED',
  'TRIAL_INVITATION',
  'TRIAL_ENDING',
  'TASK_ASSIGNED',
  'MEMBER_JOINED',
  'MENTION',
  'MILESTONE_COMPLETED',
  'REPUTATION_MILESTONE',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------------------
// Report reasons
// ---------------------------------------------------------------------------

export const REPORT_REASONS = [
  'SPAM',
  'HARASSMENT',
  'SCAM',
  'ILLEGAL_CONTENT',
  'IMPERSONATION',
  'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// ---------------------------------------------------------------------------
// Clan
// ---------------------------------------------------------------------------

export const CLAN_TYPES = ['UNIVERSITY', 'COMMUNITY', 'RESEARCH', 'COMPANY', 'OPEN'] as const;
export type ClanType = (typeof CLAN_TYPES)[number];

export const CLAN_VISIBILITY = ['PUBLIC', 'REQUEST_TO_JOIN', 'INVITE_ONLY'] as const;
export type ClanVisibility = (typeof CLAN_VISIBILITY)[number];

export const CLAN_MEMBER_ROLES = ['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'] as const;
export type ClanMemberRole = (typeof CLAN_MEMBER_ROLES)[number];
