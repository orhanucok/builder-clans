/**
 * Database types — hand-written to match supabase/migrations/0001_init.sql.
 *
 * In a real Supabase setup this file is regenerated with:
 *   supabase gen types typescript --local > types/database.ts
 *
 * Keeping a hand-written version here means the project can be type-checked
 * and explored without a running Supabase instance.
 */

import type {
  UserType,
  ProjectStage,
  ProjectCategory,
  ProjectVisibility,
  RemoteMode,
  WeeklyHoursBucket,
  ProjectRoleStatus,
  ProjectMemberType,
  ProjectMemberStatus,
  ApplicationStatus,
  MatchStatus,
  TrialStatus,
  MilestoneStatus,
  TaskStatus,
  TaskPriority,
  ArtifactType,
  ContributionType,
  ChannelType,
  XpEventType,
  ReputationSource,
  NotificationType,
  ReportReason,
  ClanType,
  ClanVisibility,
  ClanMemberRole,
} from '@/config/constants';

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
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
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          username: string;
          display_name: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      profile_skills: {
        Row: { profile_id: string; skill: string };
        Insert: { profile_id: string; skill: string };
        Update: never;
      };
      profile_interests: {
        Row: { profile_id: string; interest: string };
        Insert: { profile_id: string; interest: string };
        Update: never;
      };

      projects: {
        Row: {
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
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['projects']['Row'],
          'id' | 'created_at' | 'updated_at' | 'slug'
        > & {
          id?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
      };
      project_skills: {
        Row: { project_id: string; skill: string };
        Insert: { project_id: string; skill: string };
        Update: never;
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          member_type: ProjectMemberType;
          status: ProjectMemberStatus;
          role_title: string | null;
          joined_at: string;
          left_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['project_members']['Row']> & {
          project_id: string;
          user_id: string;
          member_type: ProjectMemberType;
        };
        Update: Partial<Database['public']['Tables']['project_members']['Row']>;
      };
      project_roles: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['project_roles']['Row']> & {
          project_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['project_roles']['Row']>;
      };
      applications: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['applications']['Row']> & {
          project_id: string;
          applicant_id: string;
        };
        Update: Partial<Database['public']['Tables']['applications']['Row']>;
      };
      matches: {
        Row: {
          id: string;
          project_id: string;
          role_id: string | null;
          initiator_user_id: string;
          candidate_user_id: string;
          status: MatchStatus;
          final_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['matches']['Row']> & {
          project_id: string;
          initiator_user_id: string;
          candidate_user_id: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Row']>;
      };
      match_scores: {
        Row: {
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
          explanation_json: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['match_scores']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['match_scores']['Row']>;
      };
      trials: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['trials']['Row']> & {
          project_id: string;
          owner_id: string;
          goal: string;
          deliverables: string[];
        };
        Update: Partial<Database['public']['Tables']['trials']['Row']>;
      };
      trial_members: {
        Row: {
          id: string;
          trial_id: string;
          user_id: string;
          role: 'OWNER' | 'COLLABORATOR';
          status: 'ACTIVE' | 'LEFT';
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trial_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['trial_members']['Row']>;
      };
      trial_reviews: {
        Row: {
          id: string;
          trial_id: string;
          reviewer_id: string;
          reviewee_id: string;
          would_work_again: 'YES' | 'MAYBE' | 'NO';
          communication: number;
          reliability: number;
          technical: number;
          commitment: number;
          collaboration: number;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['trial_reviews']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['trial_reviews']['Row']>;
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: MilestoneStatus;
          target_date: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['milestones']['Row']> & {
          project_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['milestones']['Row']>;
      };
      tasks: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['tasks']['Row']> & {
          title: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Row']>;
      };
      project_updates: {
        Row: {
          id: string;
          project_id: string;
          author_id: string;
          body: string;
          visibility: 'TEAM' | 'PUBLIC';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['project_updates']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['project_updates']['Row']>;
      };
      artifacts: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          type: ArtifactType;
          url: string;
          description: string | null;
          creator_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['artifacts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['artifacts']['Row']>;
      };
      contributions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          type: ContributionType;
          description: string;
          evidence_url: string | null;
          verified_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contributions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['contributions']['Row']>;
      };
      channels: {
        Row: {
          id: string;
          type: ChannelType;
          project_id: string | null;
          trial_id: string | null;
          clan_id: string | null;
          name: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['channels']['Row']>;
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          content: string;
          reply_to: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
      };
      xp_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: XpEventType;
          entity_type: string | null;
          entity_id: string | null;
          idempotency_key: string;
          xp_amount: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['xp_events']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      reputation_events: {
        Row: {
          id: string;
          user_id: string;
          source: ReputationSource;
          source_id: string | null;
          source_type: string | null;
          delta: number;
          weight: number;
          reason: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['reputation_events']['Row'],
          'id' | 'created_at'
        >;
        Update: never;
      };
      clans: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['clans']['Row']> & {
          name: string;
          owner_id: string;
          slug: string;
        };
        Update: Partial<Database['public']['Tables']['clans']['Row']>;
      };
      clan_members: {
        Row: {
          id: string;
          clan_id: string;
          user_id: string;
          role: ClanMemberRole;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clan_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['clan_members']['Row']>;
      };
      clan_projects: {
        Row: { clan_id: string; project_id: string; created_at: string };
        Insert: { clan_id: string; project_id: string; created_at?: string };
        Update: never;
      };
      challenges: {
        Row: {
          id: string;
          clan_id: string | null;
          title: string;
          description: string;
          sponsor: string | null;
          rules: string | null;
          start_at: string;
          deadline_at: string;
          prizes: Json | null;
          judging_criteria: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['challenges']['Row']> & {
          title: string;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['challenges']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reason: ReportReason;
          description: string | null;
          target_user_id: string | null;
          target_project_id: string | null;
          target_message_id: string | null;
          status: 'OPEN' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reports']['Row']>;
      };
      analytics_events: {
        Row: {
          id: string;
          event: string;
          user_id: string | null;
          properties: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['analytics_events']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      saved_projects: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_projects']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_profile_xp: {
        Args: { p_user_id: string; p_xp_delta: number };
        Returns: void;
      };
      recompute_reputation: {
        Args: { p_user_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}
