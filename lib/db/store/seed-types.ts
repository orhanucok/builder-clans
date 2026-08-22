/**
 * Demo seed types — local shapes for the seed data writer.
 *
 * These are the "fat" seed shapes (joined arrays like `skills` and `interests`)
 * that get flattened into per-table rows when the seed is applied.
 */

import type {
  UserType,
  WeeklyHoursBucket,
  RemoteMode,
  ProjectCategory,
  ProjectStage,
  ProjectVisibility,
  ProjectMemberType,
  ProjectMemberStatus,
  ProjectRoleStatus,
  ApplicationStatus,
  MatchStatus,
  TrialStatus,
  TaskStatus,
  TaskPriority,
  MilestoneStatus,
  ArtifactType,
  ContributionType,
  ChannelType,
  XpEventType,
  ReputationSource,
  NotificationType,
  ClanType,
  ClanVisibility,
  ClanMemberRole,
} from '@/config/constants';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  user_type: UserType | null;
  institution: string | null;
  location: string | null;
  country_code: string | null;
  timezone: string | null;
  weekly_hours: WeeklyHoursBucket | null;
  remote_preference: RemoteMode | null;
  builder_xp: number;
  builder_level: number;
  reputation_score: number;
  onboarding_completed: boolean;
  created_at: string;
  skills: string[];
  interests: string[];
}

export interface Project {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  category: ProjectCategory;
  stage: ProjectStage;
  visibility: ProjectVisibility;
  remote_mode: RemoteMode;
  location: string | null;
  weekly_commitment_min: number;
  weekly_commitment_max: number;
  github_url: string | null;
  demo_url: string | null;
  website_url: string | null;
  tags: string[] | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  commitment_min: number;
  commitment_max: number;
  experience_level: 'ANY' | 'JUNIOR' | 'MID' | 'SENIOR';
  required_skills: string[] | null;
  status: ProjectRoleStatus;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  member_type: ProjectMemberType;
  status: ProjectMemberStatus;
  role_title: string | null;
  joined_at: string;
  left_at: string | null;
}

export interface Application {
  id: string;
  project_id: string;
  role_id: string | null;
  applicant_id: string;
  why_interested: string | null;
  contribution: string | null;
  hours_per_week: number | null;
  relevant_work_url: string | null;
  note: string | null;
  status: ApplicationStatus;
  created_at: string;
  decided_at: string | null;
}

export interface Match {
  id: string;
  project_id: string;
  role_id: string | null;
  initiator_user_id: string;
  candidate_user_id: string;
  status: MatchStatus;
  final_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface MatchScore {
  id: string;
  match_id: string;
  skill_score: number;
  interest_score: number;
  role_score: number;
  availability_score: number;
  commitment_score: number;
  experience_score: number;
  location_score: number;
  reputation_score: number;
  final_score: number;
  explanation_json: unknown | null;
  created_at: string;
}

export interface Trial {
  id: string;
  project_id: string;
  role_id: string | null;
  match_id: string | null;
  owner_id: string;
  status: TrialStatus;
  goal: string;
  deliverables: string[];
  duration_days: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface TrialMember {
  id: string;
  trial_id: string;
  user_id: string;
  role: 'OWNER' | 'COLLABORATOR';
  status: 'ACTIVE' | 'LEFT';
  joined_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  trial_id: string | null;
  milestone_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  visibility: 'TEAM' | 'PUBLIC';
  created_at: string;
}

export interface Artifact {
  id: string;
  project_id: string;
  title: string;
  type: ArtifactType;
  url: string;
  description: string | null;
  creator_id: string;
  created_at: string;
}

export interface Contribution {
  id: string;
  user_id: string;
  project_id: string;
  type: ContributionType;
  description: string;
  evidence_url: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  type: ChannelType;
  project_id: string | null;
  trial_id: string | null;
  clan_id: string | null;
  name: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  reply_to: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface XpEvent {
  id: string;
  user_id: string;
  event_type: XpEventType;
  entity_type: string | null;
  entity_id: string | null;
  idempotency_key: string;
  xp_amount: number;
  created_at: string;
}

export interface ReputationEvent {
  id: string;
  user_id: string;
  source: ReputationSource;
  source_id: string | null;
  source_type: string | null;
  delta: number;
  weight: number;
  reason: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Clan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: ClanType;
  institution: string | null;
  country_code: string | null;
  visibility: ClanVisibility;
  owner_id: string;
  xp: number;
  lifetime_xp: number;
  created_at: string;
}

export interface ClanMember {
  id: string;
  clan_id: string;
  user_id: string;
  role: ClanMemberRole;
  joined_at: string;
}
