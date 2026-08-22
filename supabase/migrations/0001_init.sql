-- =========================================================================
-- Builder Clans — Initial Schema
-- Master plan §61-§85
--
-- Tables, enums, indexes, RLS, helper functions, and triggers.
-- Apply via:  supabase db push
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Enums (using check constraints so the type system in our app stays free)
-- -------------------------------------------------------------------------

-- Project stage
do $$ begin
  create type project_stage as enum (
    'IDEA','VALIDATING','PROTOTYPE','BUILDING','TESTING','LAUNCHED','MAINTAINING','PAUSED','COMPLETED'
  );
exception when duplicate_object then null; end $$;

-- Project category
do $$ begin
  create type project_category as enum (
    'AI_ML','ROBOTICS','HEALTHCARE','BIOTECHNOLOGY','DEVELOPER_TOOLS','SAAS','CONSUMER',
    'HARDWARE','RESEARCH','CLIMATE','FINTECH','EDUCATION','GAMING','CYBERSECURITY','OTHER'
  );
exception when duplicate_object then null; end $$;

-- Project visibility
do $$ begin
  create type project_visibility as enum ('PUBLIC','PRIVATE','UNLISTED');
exception when duplicate_object then null; end $$;

-- Remote mode
do $$ begin
  create type remote_mode as enum ('REMOTE','HYBRID','ONSITE');
exception when duplicate_object then null; end $$;

-- User type
do $$ begin
  create type user_type as enum (
    'STUDENT','RESEARCHER','FOUNDER','ENGINEER','DESIGNER','MEDICAL','OTHER'
  );
exception when duplicate_object then null; end $$;

-- Weekly hours bucket
do $$ begin
  create type weekly_hours_bucket as enum ('LESS_THAN_5','5_TO_10','10_TO_20','20_PLUS');
exception when duplicate_object then null; end $$;

-- Project member type / status
do $$ begin
  create type project_member_type as enum ('OWNER','CORE_MEMBER','COLLABORATOR','ADVISOR');
exception when duplicate_object then null; end $$;
do $$ begin
  create type project_member_status as enum ('ACTIVE','LEFT','REMOVED');
exception when duplicate_object then null; end $$;

-- Project role
do $$ begin
  create type project_role_status as enum ('OPEN','MATCHING','FILLED','CLOSED');
exception when duplicate_object then null; end $$;

-- Applications / match
do $$ begin
  create type application_status as enum ('PENDING','ACCEPTED','REJECTED','WITHDRAWN');
exception when duplicate_object then null; end $$;
do $$ begin
  create type match_status as enum ('SUGGESTED','INVITED','APPLIED','MUTUAL','DECLINED','EXPIRED','TRIAL_STARTED');
exception when duplicate_object then null; end $$;

-- Trial
do $$ begin
  create type trial_status as enum ('DRAFT','ACTIVE','COMPLETED','SUCCESSFUL','ENDED','EXPIRED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type trial_member_role as enum ('OWNER','COLLABORATOR');
exception when duplicate_object then null; end $$;
do $$ begin
  create type would_work_again as enum ('YES','MAYBE','NO');
exception when duplicate_object then null; end $$;

-- Milestone / task
do $$ begin
  create type milestone_status as enum ('PLANNED','IN_PROGRESS','COMPLETED','BLOCKED','CANCELLED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type task_status as enum ('TODO','IN_PROGRESS','DONE','BLOCKED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type task_priority as enum ('LOW','MEDIUM','HIGH','URGENT');
exception when duplicate_object then null; end $$;

-- Artifact
do $$ begin
  create type artifact_type as enum ('GITHUB_REPO','DEMO','WEBSITE','DOCUMENT','DATASET','PAPER','VIDEO','DESIGN','OTHER');
exception when duplicate_object then null; end $$;

-- Channel
do $$ begin
  create type channel_type as enum ('PROJECT','TRIAL','CLAN','DIRECT');
exception when duplicate_object then null; end $$;

-- Clan
do $$ begin
  create type clan_type as enum ('UNIVERSITY','COMMUNITY','RESEARCH','COMPANY','OPEN');
exception when duplicate_object then null; end $$;
do $$ begin
  create type clan_visibility as enum ('PUBLIC','REQUEST_TO_JOIN','INVITE_ONLY');
exception when duplicate_object then null; end $$;
do $$ begin
  create type clan_member_role as enum ('OWNER','ADMIN','MODERATOR','MEMBER');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  headline text,
  user_type user_type,
  institution text,
  location text,
  country_code text,
  timezone text,
  weekly_hours weekly_hours_bucket,
  remote_preference remote_mode,
  builder_xp integer not null default 0,
  builder_level integer not null default 1,
  reputation_score numeric not null default 50,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_username on public.profiles (lower(username));
create index if not exists idx_profiles_user_type on public.profiles (user_type);

-- Profile skills / interests
create table if not exists public.profile_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  primary key (profile_id, skill)
);
create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest text not null,
  primary key (profile_id, interest)
);

-- -------------------------------------------------------------------------
-- projects
-- -------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  slug text unique not null,
  title text not null,
  short_description text not null,
  description text not null,
  category project_category not null,
  stage project_stage not null default 'IDEA',
  visibility project_visibility not null default 'PUBLIC',
  remote_mode remote_mode not null default 'REMOTE',
  location text,
  weekly_commitment_min integer not null,
  weekly_commitment_max integer not null,
  github_url text,
  demo_url text,
  website_url text,
  tags text[] not null default '{}',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_projects_owner on public.projects (owner_id);
create index if not exists idx_projects_visibility_created on public.projects (visibility, created_at desc);
create index if not exists idx_projects_category on public.projects (category);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_tags on public.projects using gin (tags);

create table if not exists public.project_skills (
  project_id uuid not null references public.projects(id) on delete cascade,
  skill text not null,
  primary key (project_id, skill)
);

create table if not exists public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_type project_member_type not null,
  status project_member_status not null default 'ACTIVE',
  role_title text,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (project_id, user_id)
);
create index if not exists idx_project_members_project on public.project_members (project_id);
create index if not exists idx_project_members_user on public.project_members (user_id);

create table if not exists public.project_roles (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  commitment_min integer not null,
  commitment_max integer not null,
  experience_level text not null default 'ANY',
  required_skills text[] not null default '{}',
  status project_role_status not null default 'OPEN',
  created_at timestamptz not null default now()
);
create index if not exists idx_project_roles_project on public.project_roles (project_id, status);

-- -------------------------------------------------------------------------
-- Applications / matches
-- -------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role_id uuid references public.project_roles(id) on delete set null,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  why_interested text,
  contribution text,
  hours_per_week integer,
  relevant_work_url text,
  note text,
  status application_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index if not exists uniq_application_pending
  on public.applications (project_id, applicant_id)
  where status = 'PENDING';

create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role_id uuid references public.project_roles(id) on delete set null,
  initiator_user_id uuid not null references public.profiles(id) on delete cascade,
  candidate_user_id uuid not null references public.profiles(id) on delete cascade,
  status match_status not null default 'SUGGESTED',
  final_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_matches_candidate on public.matches (candidate_user_id, status);
create index if not exists idx_matches_project on public.matches (project_id, status);

create table if not exists public.match_scores (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  skill_score integer not null,
  interest_score integer not null,
  role_score integer not null,
  availability_score integer not null,
  commitment_score integer not null,
  experience_score integer not null,
  location_score integer not null,
  reputation_score integer not null,
  final_score integer not null,
  explanation_json jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Trials
-- -------------------------------------------------------------------------
create table if not exists public.trials (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role_id uuid references public.project_roles(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  status trial_status not null default 'DRAFT',
  goal text not null,
  deliverables text[] not null default '{}',
  duration_days integer not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_trials_project on public.trials (project_id);
create index if not exists idx_trials_owner on public.trials (owner_id);
create index if not exists idx_trials_status on public.trials (status);

create table if not exists public.trial_members (
  id uuid primary key default uuid_generate_v4(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role trial_member_role not null,
  status text not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  unique (trial_id, user_id)
);

create table if not exists public.trial_reviews (
  id uuid primary key default uuid_generate_v4(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  would_work_again would_work_again not null,
  communication integer not null check (communication between 1 and 5),
  reliability integer not null check (reliability between 1 and 5),
  technical integer not null check (technical between 1 and 5),
  commitment integer not null check (commitment between 1 and 5),
  collaboration integer not null check (collaboration between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (trial_id, reviewer_id, reviewee_id)
);

-- -------------------------------------------------------------------------
-- Milestones / tasks / updates / artifacts / contributions
-- -------------------------------------------------------------------------
create table if not exists public.milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status milestone_status not null default 'PLANNED',
  target_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  trial_id uuid references public.trials(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'TODO',
  priority task_priority not null default 'MEDIUM',
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((project_id is not null) or (trial_id is not null))
);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_trial on public.tasks (trial_id);
create index if not exists idx_tasks_assignee on public.tasks (assignee_id);

create table if not exists public.project_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  visibility text not null default 'TEAM',
  created_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  type artifact_type not null,
  url text not null,
  description text,
  creator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  description text not null,
  evidence_url text,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_contributions_user on public.contributions (user_id);

-- -------------------------------------------------------------------------
-- Channels / messages
-- -------------------------------------------------------------------------
create table if not exists public.channels (
  id uuid primary key default uuid_generate_v4(),
  type channel_type not null,
  project_id uuid references public.projects(id) on delete cascade,
  trial_id uuid references public.trials(id) on delete cascade,
  clan_id uuid,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_channels_project on public.channels (project_id);
create index if not exists idx_channels_trial on public.channels (trial_id);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  reply_to uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_channel on public.messages (channel_id, created_at);

-- -------------------------------------------------------------------------
-- XP / reputation
-- -------------------------------------------------------------------------
create table if not exists public.xp_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id text,
  idempotency_key text not null,
  xp_amount integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, idempotency_key)
);
create index if not exists idx_xp_events_user on public.xp_events (user_id, created_at desc);

create table if not exists public.reputation_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null,
  source_id text,
  source_type text,
  delta numeric not null,
  weight numeric not null default 1,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_reputation_events_user on public.reputation_events (user_id, created_at desc);

-- -------------------------------------------------------------------------
-- Clans / challenges
-- -------------------------------------------------------------------------
create table if not exists public.clans (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  type clan_type not null,
  institution text,
  country_code text,
  visibility clan_visibility not null default 'PUBLIC',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  xp integer not null default 0,
  lifetime_xp integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role clan_member_role not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  unique (clan_id, user_id)
);

create table if not exists public.clan_projects (
  clan_id uuid not null references public.clans(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clan_id, project_id)
);

create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid references public.clans(id) on delete set null,
  title text not null,
  description text not null,
  sponsor text,
  rules text,
  start_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  prizes jsonb,
  judging_criteria text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Notifications / reports / analytics
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  description text,
  target_user_id uuid references public.profiles(id) on delete cascade,
  target_project_id uuid references public.projects(id) on delete cascade,
  target_message_id uuid references public.messages(id) on delete cascade,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event text not null,
  user_id uuid references public.profiles(id) on delete set null,
  properties jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_event on public.analytics_events (event, created_at desc);

-- -------------------------------------------------------------------------
-- Helper functions
-- -------------------------------------------------------------------------
create or replace function public.increment_profile_xp(p_user_id uuid, p_xp_delta integer)
returns void as $$
declare
  v_xp integer;
  v_level integer := 1;
begin
  update public.profiles
    set builder_xp = greatest(0, builder_xp + p_xp_delta),
        updated_at = now()
  where id = p_user_id
  returning builder_xp into v_xp;

  -- Recompute level from the canonical threshold table (matches config/gamification.ts).
  -- L1 = 0, L2 = 100, L3 = 250, L4 = 500, L5 = 900, L6 = 1400, L7 = 2000, L8 = 2800,
  -- L9 = 3800, L10 = 5000, L11 = 6500, L12 = 8200, L13 = 10000, L14 = 12000,
  -- L15 = 14500, L16 = 17500, L17 = 21000, L18 = 25000, L19 = 29500, L20 = 35000.
  if v_xp >= 35000 then v_level := 20;
  elsif v_xp >= 29500 then v_level := 19;
  elsif v_xp >= 25000 then v_level := 18;
  elsif v_xp >= 21000 then v_level := 17;
  elsif v_xp >= 17500 then v_level := 16;
  elsif v_xp >= 14500 then v_level := 15;
  elsif v_xp >= 12000 then v_level := 14;
  elsif v_xp >= 10000 then v_level := 13;
  elsif v_xp >= 8200 then v_level := 12;
  elsif v_xp >= 6500 then v_level := 11;
  elsif v_xp >= 5000 then v_level := 10;
  elsif v_xp >= 3800 then v_level := 9;
  elsif v_xp >= 2800 then v_level := 8;
  elsif v_xp >= 2000 then v_level := 7;
  elsif v_xp >= 1400 then v_level := 6;
  elsif v_xp >= 900 then v_level := 5;
  elsif v_xp >= 500 then v_level := 4;
  elsif v_xp >= 250 then v_level := 3;
  elsif v_xp >= 100 then v_level := 2;
  else v_level := 1;
  end if;

  update public.profiles
    set builder_level = v_level
  where id = p_user_id;
end;
$$ language plpgsql security definer;

create or replace function public.recompute_reputation(p_user_id uuid)
returns numeric as $$
declare
  prior_weight numeric := 8;
  prior_value numeric := 50;
  observed_weight numeric;
  observed numeric;
  total numeric;
begin
  select coalesce(sum(weight), 0) into observed_weight from public.reputation_events where user_id = p_user_id;
  select coalesce(sum(delta * weight), 0) into observed from public.reputation_events where user_id = p_user_id;
  total := prior_weight + observed_weight;
  return greatest(0, least(100, round(((prior_value * prior_weight + observed) / total)::numeric, 2)));
end;
$$ language plpgsql stable;

-- -------------------------------------------------------------------------
-- updated_at triggers
-- -------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_matches_updated on public.matches;
create trigger trg_matches_updated before update on public.matches
for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- New user → profile row trigger
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New Builder'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- Row Level Security (RLS) — master plan §85
-- -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_skills enable row level security;
alter table public.profile_interests enable row level security;
alter table public.projects enable row level security;
alter table public.project_skills enable row level security;
alter table public.project_members enable row level security;
alter table public.project_roles enable row level security;
alter table public.applications enable row level security;
alter table public.matches enable row level security;
alter table public.match_scores enable row level security;
alter table public.trials enable row level security;
alter table public.trial_members enable row level security;
alter table public.trial_reviews enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.project_updates enable row level security;
alter table public.artifacts enable row level security;
alter table public.contributions enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.xp_events enable row level security;
alter table public.reputation_events enable row level security;
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_projects enable row level security;
alter table public.challenges enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.analytics_events enable row level security;

-- profiles: public read of all rows; users can edit only their own row
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profile_skills_select on public.profile_skills;
create policy profile_skills_select on public.profile_skills for select using (true);
drop policy if exists profile_skills_write_self on public.profile_skills;
create policy profile_skills_write_self on public.profile_skills
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists profile_interests_select on public.profile_interests;
create policy profile_interests_select on public.profile_interests for select using (true);
drop policy if exists profile_interests_write_self on public.profile_interests;
create policy profile_interests_write_self on public.profile_interests
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- projects: public read of PUBLIC; members can read their own; owners can write
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (
    visibility = 'PUBLIC' or auth.uid() = owner_id or exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
    )
  );
drop policy if exists projects_write_owner on public.projects;
create policy projects_write_owner on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists project_skills_select on public.project_skills;
create policy project_skills_select on public.project_skills for select using (true);
drop policy if exists project_skills_write_owner on public.project_skills;
create policy project_skills_write_owner on public.project_skills
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select using (true);
drop policy if exists project_members_write_owner on public.project_members;
create policy project_members_write_owner on public.project_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
    or auth.uid() = user_id
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
    or auth.uid() = user_id
  );

drop policy if exists project_roles_select on public.project_roles;
create policy project_roles_select on public.project_roles for select using (true);
drop policy if exists project_roles_write_owner on public.project_roles;
create policy project_roles_write_owner on public.project_roles
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- applications: applicant can insert/select; owner can read/decide
drop policy if exists applications_applicant_all on public.applications;
create policy applications_applicant_all on public.applications
  for all using (auth.uid() = applicant_id) with check (auth.uid() = applicant_id);
drop policy if exists applications_owner_select on public.applications;
create policy applications_owner_select on public.applications
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
drop policy if exists applications_owner_update on public.applications;
create policy applications_owner_update on public.applications
  for update using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- matches: only participants can see/update
drop policy if exists matches_participant on public.matches;
create policy matches_participant on public.matches
  for all using (
    auth.uid() = initiator_user_id
    or auth.uid() = candidate_user_id
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    auth.uid() = initiator_user_id
    or auth.uid() = candidate_user_id
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists match_scores_select on public.match_scores;
create policy match_scores_select on public.match_scores for select using (true);
drop policy if exists match_scores_write on public.match_scores;
create policy match_scores_write on public.match_scores
  for insert with check (
    exists (select 1 from public.matches m where m.id = match_id and (
      auth.uid() = m.initiator_user_id or auth.uid() = m.candidate_user_id
      or exists (select 1 from public.projects p where p.id = m.project_id and p.owner_id = auth.uid())
    ))
  );

-- trials & trial_members
drop policy if exists trials_select on public.trials;
create policy trials_select on public.trials for select using (
  exists (select 1 from public.trial_members tm where tm.trial_id = trials.id and tm.user_id = auth.uid())
  or auth.uid() = owner_id
);
drop policy if exists trials_write_owner on public.trials;
create policy trials_write_owner on public.trials
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists trial_members_select on public.trial_members;
create policy trial_members_select on public.trial_members for select using (
  auth.uid() = user_id
  or exists (select 1 from public.trials t where t.id = trial_id and t.owner_id = auth.uid())
);
drop policy if exists trial_members_write on public.trial_members;
create policy trial_members_write on public.trial_members
  for all using (auth.uid() = user_id or exists (
    select 1 from public.trials t where t.id = trial_id and t.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.trials t where t.id = trial_id and t.owner_id = auth.uid()
  ));

drop policy if exists trial_reviews_select on public.trial_reviews;
create policy trial_reviews_select on public.trial_reviews for select using (
  auth.uid() = reviewer_id or auth.uid() = reviewee_id
);
drop policy if exists trial_reviews_write on public.trial_reviews;
create policy trial_reviews_write on public.trial_reviews
  for insert with check (auth.uid() = reviewer_id);

-- milestones, tasks, updates, artifacts
drop policy if exists milestones_all on public.milestones;
create policy milestones_all on public.milestones
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and (
      p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    ))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and (
      p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    ))
  );

drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (
    (project_id is not null and exists (
      select 1 from public.projects p where p.id = project_id and (
        p.owner_id = auth.uid() or exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
        )
      )
    ))
    or (trial_id is not null and exists (
      select 1 from public.trial_members tm where tm.trial_id = trial_id and tm.user_id = auth.uid()
    ))
  ) with check (
    (project_id is not null and exists (
      select 1 from public.projects p where p.id = project_id and (
        p.owner_id = auth.uid() or exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
        )
      )
    ))
    or (trial_id is not null and exists (
      select 1 from public.trial_members tm where tm.trial_id = trial_id and tm.user_id = auth.uid()
    ))
  );

drop policy if exists project_updates_all on public.project_updates;
create policy project_updates_all on public.project_updates
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and (
      p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    ))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and (
      p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    ))
  );

drop policy if exists artifacts_all on public.artifacts;
create policy artifacts_all on public.artifacts
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and (
      p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    ))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and (
      p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    ))
  );

drop policy if exists contributions_select on public.contributions;
create policy contributions_select on public.contributions for select using (true);
drop policy if exists contributions_write_self on public.contributions;
create policy contributions_write_self on public.contributions
  for insert with check (auth.uid() = user_id);

-- channels & messages
drop policy if exists channels_select on public.channels;
create policy channels_select on public.channels for select using (
  (project_id is not null and exists (
    select 1 from public.projects p where p.id = project_id and (
      p.visibility = 'PUBLIC' or p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
      )
    )
  ))
  or (trial_id is not null and exists (
    select 1 from public.trial_members tm where tm.trial_id = trial_id and tm.user_id = auth.uid()
  ))
);
drop policy if exists channels_write on public.channels;
create policy channels_write on public.channels
  for insert with check (
    (project_id is not null and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
    or (trial_id is not null and exists (select 1 from public.trials t where t.id = trial_id and t.owner_id = auth.uid()))
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  exists (select 1 from public.channels c where c.id = channel_id and (
    (c.project_id is not null and exists (
      select 1 from public.projects p where p.id = c.project_id and (
        p.visibility = 'PUBLIC' or p.owner_id = auth.uid() or exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.status = 'ACTIVE'
        )
      )
    ))
    or (c.trial_id is not null and exists (
      select 1 from public.trial_members tm where tm.trial_id = c.trial_id and tm.user_id = auth.uid()
    ))
  ))
);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (auth.uid() = sender_id);

-- xp / reputation
drop policy if exists xp_events_select_self on public.xp_events;
create policy xp_events_select_self on public.xp_events for select using (auth.uid() = user_id);
drop policy if exists reputation_events_select_self on public.reputation_events;
create policy reputation_events_select_self on public.reputation_events for select using (auth.uid() = user_id);

-- notifications: only the owner can see / update
drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reports: anyone can submit, only owner / admin can read
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports for select using (auth.uid() = reporter_id);

-- analytics: opt-in only
drop policy if exists analytics_insert on public.analytics_events;
create policy analytics_insert on public.analytics_events for insert with check (true);
drop policy if exists analytics_select_admin on public.analytics_events;
create policy analytics_select_admin on public.analytics_events for select using (false);
