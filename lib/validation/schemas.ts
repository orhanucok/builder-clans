/**
 * Centralized zod schemas for user input.
 *
 * Master plan §112: "validation merkezi olsun."
 * Master plan §86: validate all inputs.
 *
 * These schemas are used both for form validation on the client AND for
 * request validation in server actions / route handlers.
 */

import { z } from 'zod';
import {
  PROJECT_CATEGORIES,
  PROJECT_STAGES,
  PROJECT_VISIBILITY,
  REMOTE_MODES,
  USER_TYPES,
  WEEKLY_HOURS_BUCKETS,
  CONTRIBUTION_TYPES,
  ARTIFACT_TYPES,
  CLAN_TYPES,
  CLAN_VISIBILITY,
} from '@/config/constants';

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .min(3, 'At least 3 characters')
  .max(32, 'Max 32 characters')
  .regex(/^[a-z0-9_-]+$/i, 'Only letters, numbers, _ and -')
  .transform((s) => s.toLowerCase());

export const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and dashes');

export const urlSchema = z
  .string()
  .url('Must be a valid URL')
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional();

// ---------------------------------------------------------------------------
// Profile / Onboarding
// ---------------------------------------------------------------------------

export const onboardingSchema = z.object({
  userType: z.enum(USER_TYPES),
  displayName: z.string().min(2).max(60),
  headline: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  bio: z.string().max(600).optional().or(z.literal('').transform(() => undefined)),
  institution: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  location: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  countryCode: z
    .string()
    .length(2, 'Two-letter country code')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  weeklyHours: z.enum(WEEKLY_HOURS_BUCKETS),
  skills: z.array(z.string().min(1).max(40)).min(1, 'Pick at least one skill').max(10),
  interests: z.array(z.string().min(1).max(40)).min(0).max(15),
  goal: z.enum(['BUILD_MY_PROJECT', 'JOIN_A_PROJECT', 'BOTH', 'EXPLORE']),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileUpdateSchema = onboardingSchema
  .partial()
  .extend({
    avatarUrl: urlSchema,
  });
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const projectCreateSchema = z.object({
  title: z.string().min(3).max(80),
  shortDescription: z.string().min(10).max(160),
  fullDescription: z.string().min(20).max(8000),
  category: z.enum(PROJECT_CATEGORIES),
  stage: z.enum(PROJECT_STAGES),
  visibility: z.enum(PROJECT_VISIBILITY).default('PUBLIC'),
  remoteMode: z.enum(REMOTE_MODES).default('REMOTE'),
  location: z.string().max(120).optional(),
  weeklyCommitmentMin: z.coerce.number().int().min(1).max(80),
  weeklyCommitmentMax: z.coerce.number().int().min(1).max(80),
  githubUrl: urlSchema,
  demoUrl: urlSchema,
  websiteUrl: urlSchema,
  tags: z.array(z.string().min(1).max(30)).max(15).default([]),
  requiredSkills: z.array(z.string().min(1).max(40)).max(15).default([]),
});
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = projectCreateSchema.partial();
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

// ---------------------------------------------------------------------------
// Project role
// ---------------------------------------------------------------------------

export const projectRoleCreateSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(800).optional(),
  commitmentMin: z.coerce.number().int().min(1).max(80),
  commitmentMax: z.coerce.number().int().min(1).max(80),
  experienceLevel: z.enum(['ANY', 'JUNIOR', 'MID', 'SENIOR']).default('ANY'),
  requiredSkills: z.array(z.string().min(1).max(40)).max(15).default([]),
});
export type ProjectRoleCreateInput = z.infer<typeof projectRoleCreateSchema>;

// ---------------------------------------------------------------------------
// Application / Invitation
// ---------------------------------------------------------------------------

export const applicationCreateSchema = z.object({
  roleId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  whyInterested: z.string().max(1000).optional(),
  contribution: z.string().max(1000).optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(80),
  relevantWorkUrl: urlSchema,
  note: z.string().max(500).optional(),
});
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;

// ---------------------------------------------------------------------------
// Trial
// ---------------------------------------------------------------------------

export const trialCreateSchema = z.object({
  projectId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  durationDays: z.union([z.literal(7), z.literal(14)]).default(7),
  goal: z.string().min(10).max(800),
  deliverables: z.array(z.string().min(1).max(200)).min(1).max(8),
  memberUserIds: z.array(z.string().uuid()).min(1).max(2),
});
export type TrialCreateInput = z.infer<typeof trialCreateSchema>;

export const trialReviewSchema = z.object({
  trialId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  wouldWorkAgain: z.enum(['YES', 'MAYBE', 'NO']),
  ratings: z.object({
    communication: z.coerce.number().int().min(1).max(5),
    reliability: z.coerce.number().int().min(1).max(5),
    technical: z.coerce.number().int().min(1).max(5),
    commitment: z.coerce.number().int().min(1).max(5),
    collaboration: z.coerce.number().int().min(1).max(5),
  }),
  comment: z.string().max(1000).optional(),
});
export type TrialReviewInput = z.infer<typeof trialReviewSchema>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

// ---------------------------------------------------------------------------
// Milestone
// ---------------------------------------------------------------------------

export const milestoneCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  targetDate: z.coerce.date().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).default('PLANNED'),
});
export type MilestoneCreateInput = z.infer<typeof milestoneCreateSchema>;

// ---------------------------------------------------------------------------
// Project update
// ---------------------------------------------------------------------------

export const projectUpdateCreateSchema = z.object({
  body: z.string().min(10).max(4000),
  visibility: z.enum(['TEAM', 'PUBLIC']).default('TEAM'),
});
export type ProjectUpdateCreateInput = z.infer<typeof projectUpdateCreateSchema>;

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export const artifactCreateSchema = z.object({
  title: z.string().min(1).max(120),
  type: z.enum(ARTIFACT_TYPES),
  url: z.string().url(),
  description: z.string().max(500).optional(),
});
export type ArtifactCreateInput = z.infer<typeof artifactCreateSchema>;

// ---------------------------------------------------------------------------
// Contribution
// ---------------------------------------------------------------------------

export const contributionCreateSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(CONTRIBUTION_TYPES),
  description: z.string().min(5).max(300),
  evidenceUrl: z.string().url().optional(),
});
export type ContributionCreateInput = z.infer<typeof contributionCreateSchema>;

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const messageCreateSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  replyToId: z.string().uuid().optional(),
});
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

// ---------------------------------------------------------------------------
// Clan
// ---------------------------------------------------------------------------

export const clanCreateSchema = z.object({
  name: z.string().min(3).max(60),
  description: z.string().max(2000).optional(),
  type: z.enum(CLAN_TYPES),
  visibility: z.enum(CLAN_VISIBILITY).default('PUBLIC'),
  institution: z.string().max(120).optional(),
  countryCode: z.string().length(2).optional(),
});
export type ClanCreateInput = z.infer<typeof clanCreateSchema>;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export const reportCreateSchema = z.object({
  reason: z.enum(['SPAM', 'HARASSMENT', 'SCAM', 'ILLEGAL_CONTENT', 'IMPERSONATION', 'OTHER']),
  description: z.string().max(1000).optional(),
  targetUserId: z.string().uuid().optional(),
  targetProjectId: z.string().uuid().optional(),
  targetMessageId: z.string().uuid().optional(),
});
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  username: usernameSchema,
  displayName: z.string().min(2).max(60),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;
