/**
 * Demo seed data — the 30 profiles / 20 projects / 15 roles / 10 matches /
 * 4 trials / 5 clans that the app boots with when Supabase is not configured.
 *
 * Values mirror the Supabase `supabase/seed.sql` so demo and production
 * look identical. Used by:
 *   - getMemoryDb() first access (auto-seed)
 *   - /api/dev/reset (manual reset)
 *
 * The data is hand-written (not random) so that the matching algorithm
 * produces interesting scores for the most common personas.
 */

import { getMemoryDb } from './memory';
import { getAuthStore } from './schema';
import { createHash } from 'node:crypto';
import type {
  Profile,
  Project,
  ProjectRole,
  Application,
  Match,
  MatchScore,
  Trial,
  TrialMember,
  ProjectMember,
  Task,
  Milestone,
  ProjectUpdate,
  Artifact,
  Contribution,
  Channel,
  Message,
  XpEvent,
  ReputationEvent,
  Notification,
  Clan,
  ClanMember,
} from './seed-types';

const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const HOURS_FROM_NOW = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const PROFILES: Profile[] = [
  // Builder founder (default persona)
  {
    id: 'usr_001', username: 'defne', display_name: 'Defne Yıldırım', email: 'defne@builderclans.dev',
    avatar_url: null, bio: 'Indie hacker, product thinker. Looking for a technical co-founder for a healthcare AI idea.', headline: 'Founder • Product • Looking for CTO',
    user_type: 'FOUNDER', institution: 'ODTÜ', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Product', 'UX', 'Marketing', 'Strategy'], interests: ['AI', 'HealthTech', 'SaaS'],
  },
  {
    id: 'usr_002', username: 'kayra', display_name: 'Kayra Demir', email: 'kayra@builderclans.dev',
    avatar_url: null, bio: 'ML engineer at a fintech. Building side projects in agentic workflows.', headline: 'ML engineer • Agentic AI',
    user_type: 'ENGINEER', institution: 'Bilkent', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Python', 'PyTorch', 'LLM', 'Backend'], interests: ['AI', 'Robotics', 'Developer Tools'],
  },
  {
    id: 'usr_003', username: 'ada', display_name: 'Ada Korkmaz', email: 'ada@builderclans.dev',
    avatar_url: null, bio: 'Full-stack dev. React + Next.js. Recently shipped a marketplace MVP.', headline: 'Full-stack engineer',
    user_type: 'ENGINEER', institution: 'İTÜ', location: 'İzmir, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '10_PLUS', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['TypeScript', 'React', 'Next.js', 'Postgres'], interests: ['SaaS', 'Marketplace', 'HealthTech'],
  },
  {
    id: 'usr_004', username: 'mert', display_name: 'Mert Aslan', email: 'mert@builderclans.dev',
    avatar_url: null, bio: 'Industrial design student. Loves hardware + physical products.', headline: 'Designer • Hardware curious',
    user_type: 'DESIGNER', institution: 'Mimar Sinan', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'IN_PERSON',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Figma', 'Product Design', '3D Modeling'], interests: ['Robotics', 'Hardware', 'Sustainability'],
  },
  {
    id: 'usr_005', username: 'sila', display_name: 'Sıla Aydın', email: 'sila@builderclans.dev',
    avatar_url: null, bio: 'Growth marketer, ex-startup. Good at distribution and storytelling.', headline: 'Growth & marketing',
    user_type: 'MARKETER', institution: 'Boğaziçi', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Marketing', 'SEO', 'Content', 'Growth'], interests: ['SaaS', 'EdTech', 'AI'],
  },
  {
    id: 'usr_006', username: 'kaan', display_name: 'Kaan Polat', email: 'kaan@builderclans.dev',
    avatar_url: null, bio: 'Backend engineer, distributed systems. Likes writing boring infrastructure.', headline: 'Backend engineer',
    user_type: 'ENGINEER', institution: 'Hacettepe', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Go', 'Postgres', 'Kubernetes', 'Backend'], interests: ['Developer Tools', 'AI', 'Open Source'],
  },
  {
    id: 'usr_007', username: 'zeynep', display_name: 'Zeynep Çelik', email: 'zeynep@builderclans.dev',
    avatar_url: null, bio: 'Robotics engineer, ROS + Python. Wants to build an affordable prosthetics project.', headline: 'Robotics engineer',
    user_type: 'ENGINEER', institution: 'ODTÜ', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '10_PLUS', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Python', 'ROS', 'C++', 'Robotics'], interests: ['Robotics', 'HealthTech', 'Hardware'],
  },
  {
    id: 'usr_008', username: 'emre', display_name: 'Emre Şahin', email: 'emre@builderclans.dev',
    avatar_url: null, bio: 'Frontend dev + a11y nerd. Loves making interfaces that feel right.', headline: 'Frontend engineer',
    user_type: 'ENGINEER', institution: 'Sabancı', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['React', 'TypeScript', 'CSS', 'Accessibility'], interests: ['SaaS', 'EdTech', 'AI'],
  },
  {
    id: 'usr_009', username: 'irem', display_name: 'İrem Doğan', email: 'irem@builderclans.dev',
    avatar_url: null, bio: 'Data scientist. Interested in clinical NLP and medical records.', headline: 'Data scientist',
    user_type: 'ENGINEER', institution: 'Bilkent', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Python', 'PyTorch', 'NLP', 'SQL'], interests: ['AI', 'HealthTech', 'Research'],
  },
  {
    id: 'usr_010', username: 'burak', display_name: 'Burak Yılmaz', email: 'burak@builderclans.dev',
    avatar_url: null, bio: 'Mobile dev, iOS + Android. Built a fitness app with 50k downloads.', headline: 'Mobile engineer',
    user_type: 'ENGINEER', institution: 'Ege', location: 'İzmir, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Swift', 'Kotlin', 'React Native', 'Mobile'], interests: ['HealthTech', 'Fitness', 'SaaS'],
  },
  {
    id: 'usr_011', username: 'pelin', display_name: 'Pelin Aksoy', email: 'pelin@builderclans.dev',
    avatar_url: null, bio: 'Product designer. Previously at a YC-backed startup. Believes in early prototyping.', headline: 'Senior product designer',
    user_type: 'DESIGNER', institution: 'METU', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Figma', 'Product Design', 'UX Research', 'Prototyping'], interests: ['SaaS', 'EdTech', 'Marketplace'],
  },
  {
    id: 'usr_012', username: 'onur', display_name: 'Onur Tekin', email: 'onur@builderclans.dev',
    avatar_url: null, bio: 'DevOps engineer. Loves Terraform and CI/CD.', headline: 'DevOps engineer',
    user_type: 'ENGINEER', institution: 'YTÜ', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['AWS', 'Terraform', 'Docker', 'Backend'], interests: ['Developer Tools', 'Open Source'],
  },
  {
    id: 'usr_013', username: 'ayse', display_name: 'Ayşe Kaya', email: 'ayse@builderclans.dev',
    avatar_url: null, bio: 'Content + community. Writes about building in public.', headline: 'Content & community',
    user_type: 'MARKETER', institution: 'Anadolu', location: 'Eskişehir, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Content', 'Community', 'Writing', 'Social Media'], interests: ['SaaS', 'EdTech', 'AI'],
  },
  {
    id: 'usr_014', username: 'tugce', display_name: 'Tuğçe Yıldız', email: 'tugce@builderclans.dev',
    avatar_url: null, bio: 'Data engineer. Spark + Airflow + dbt.', headline: 'Data engineer',
    user_type: 'ENGINEER', institution: 'İTÜ', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Python', 'Spark', 'Airflow', 'SQL'], interests: ['Data', 'AI', 'FinTech'],
  },
  {
    id: 'usr_015', username: 'cagan', display_name: 'Çağan Ergin', email: 'cagan@builderclans.dev',
    avatar_url: null, bio: 'Game dev, Unity + C#. Wants to build an educational game.', headline: 'Game developer',
    user_type: 'ENGINEER', institution: 'Bahçeşehir', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Unity', 'C#', 'Game Design', '3D Modeling'], interests: ['EdTech', 'Games', 'AI'],
  },
  {
    id: 'usr_016', username: 'eda', display_name: 'Eda Demir', email: 'eda@builderclans.dev',
    avatar_url: null, bio: 'UX researcher. Mixed methods.', headline: 'UX researcher',
    user_type: 'DESIGNER', institution: 'Bilkent', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['UX Research', 'Product Design', 'Interviewing'], interests: ['HealthTech', 'EdTech', 'SaaS'],
  },
  {
    id: 'usr_017', username: 'selim', display_name: 'Selim Korkmaz', email: 'selim@builderclans.dev',
    avatar_url: null, bio: 'Backend engineer at a bank. Building a budgeting app on the side.', headline: 'Backend engineer • FinTech',
    user_type: 'ENGINEER', institution: 'Galatasaray', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Java', 'Spring', 'Postgres', 'Backend'], interests: ['FinTech', 'SaaS', 'AI'],
  },
  {
    id: 'usr_018', username: 'naz', display_name: 'Naz Şen', email: 'naz@builderclans.dev',
    avatar_url: null, bio: 'Bioinformatics PhD. Wants to apply ML to protein folding.', headline: 'Bioinformatics researcher',
    user_type: 'RESEARCHER', institution: 'Bilkent', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Python', 'PyTorch', 'Bioinformatics', 'Research'], interests: ['AI', 'HealthTech', 'Research'],
  },
  {
    id: 'usr_019', username: 'batu', display_name: 'Batuhan Aydın', email: 'batu@builderclans.dev',
    avatar_url: null, bio: 'Student. Learning web dev. Wants to contribute to OSS.', headline: 'Student • Aspiring dev',
    user_type: 'STUDENT', institution: 'Hacettepe', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['JavaScript', 'React', 'CSS'], interests: ['Open Source', 'EdTech'],
  },
  {
    id: 'usr_020', username: 'ceyda', display_name: 'Ceyda Polat', email: 'ceyda@builderclans.dev',
    avatar_url: null, bio: 'Founder, non-technical. Looking for a technical co-founder for a marketplace idea.', headline: 'Founder • Non-technical',
    user_type: 'FOUNDER', institution: null, location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '10_PLUS', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Operations', 'Sales', 'Strategy'], interests: ['Marketplace', 'SaaS', 'E-commerce'],
  },
  {
    id: 'usr_021', username: 'yusuf', display_name: 'Yusuf Acar', email: 'yusuf@builderclans.dev',
    avatar_url: null, bio: 'Security engineer. Interested in privacy-first apps.', headline: 'Security engineer',
    user_type: 'ENGINEER', institution: 'Bilkent', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Security', 'Go', 'Backend', 'Cryptography'], interests: ['Privacy', 'Open Source', 'AI'],
  },
  {
    id: 'usr_022', username: 'gizem', display_name: 'Gizem Tunç', email: 'gizem@builderclans.dev',
    avatar_url: null, bio: 'Marketing lead at a B2B SaaS. Loves lifecycle and product-led growth.', headline: 'B2B growth lead',
    user_type: 'MARKETER', institution: 'Koç', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Marketing', 'Growth', 'Analytics', 'B2B'], interests: ['SaaS', 'AI', 'Developer Tools'],
  },
  {
    id: 'usr_023', username: 'hakan', display_name: 'Hakan Erol', email: 'hakan@builderclans.dev',
    avatar_url: null, bio: 'Embedded systems engineer. ESP32 + C.', headline: 'Embedded engineer',
    user_type: 'ENGINEER', institution: 'İTÜ', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['C', 'C++', 'Embedded', 'Hardware'], interests: ['IoT', 'Robotics', 'Hardware'],
  },
  {
    id: 'usr_024', username: 'leyla', display_name: 'Leyla Kaplan', email: 'leyla@builderclans.dev',
    avatar_url: null, bio: 'Brand designer. Visual identity + motion.', headline: 'Brand designer',
    user_type: 'DESIGNER', institution: 'Mimar Sinan', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Figma', 'Branding', 'Motion', 'Illustration'], interests: ['Marketplace', 'SaaS', 'E-commerce'],
  },
  {
    id: 'usr_025', username: 'arda', display_name: 'Arda Şen', email: 'arda@builderclans.dev',
    avatar_url: null, bio: 'PM at a unicorn. Interested in healthcare logistics.', headline: 'Senior PM',
    user_type: 'FOUNDER', institution: 'Bilkent', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Product', 'Strategy', 'Operations'], interests: ['HealthTech', 'SaaS', 'Logistics'],
  },
  {
    id: 'usr_026', username: 'merve', display_name: 'Merve Aslan', email: 'merve@builderclans.dev',
    avatar_url: null, bio: 'iOS dev. Working on a habit tracker.', headline: 'iOS developer',
    user_type: 'ENGINEER', institution: 'Ege', location: 'İzmir, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '6_10', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Swift', 'iOS', 'Mobile'], interests: ['HealthTech', 'Fitness', 'SaaS'],
  },
  {
    id: 'usr_027', username: 'enes', display_name: 'Enes Yıldırım', email: 'enes@builderclans.dev',
    avatar_url: null, bio: 'Open source maintainer. CLI tools in Rust.', headline: 'OSS maintainer',
    user_type: 'ENGINEER', institution: 'ODTÜ', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '4_6', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Rust', 'CLI', 'Open Source', 'Backend'], interests: ['Developer Tools', 'Open Source', 'AI'],
  },
  {
    id: 'usr_028', username: 'duygu', display_name: 'Duygu Akın', email: 'duygu@builderclans.dev',
    avatar_url: null, bio: 'Doctor + coder. Building clinical decision support tools.', headline: 'MD • Builder',
    user_type: 'RESEARCHER', institution: 'Hacettepe', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Medicine', 'Python', 'Research'], interests: ['HealthTech', 'AI', 'Research'],
  },
  {
    id: 'usr_029', username: 'sinan', display_name: 'Sinan Kaya', email: 'sinan@builderclans.dev',
    avatar_url: null, bio: 'Indie iOS dev, ships small utilities.', headline: 'Indie iOS dev',
    user_type: 'ENGINEER', institution: 'YTÜ', location: 'İstanbul, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'REMOTE_FIRST',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Swift', 'iOS', 'Product'], interests: ['Productivity', 'SaaS'],
  },
  {
    id: 'usr_030', username: 'elif', display_name: 'Elif Tunç', email: 'elif@builderclans.dev',
    avatar_url: null, bio: 'CS student. Hackathon enthusiast. Wants to learn by building.', headline: 'Student • Hackathons',
    user_type: 'STUDENT', institution: 'Bilkent', location: 'Ankara, TR', country_code: 'TR', timezone: 'Europe/Istanbul',
    weekly_hours: '2_4', remote_preference: 'FLEXIBLE',
    builder_xp: 0, builder_level: 1, reputation_score: 0, onboarding_completed: true,
    skills: ['Python', 'JavaScript', 'Hackathon'], interests: ['AI', 'EdTech', 'Hackathons'],
  },
];

// --- Projects (20) ---

const PROJECTS: Project[] = [
  {
    id: 'prj_000001', owner_id: 'usr_001', slug: 'klinik-ai',
    title: 'KlinikAI — clinical decision support for GPs',
    short_description: 'AI assistant for general practitioners to surface relevant guidelines during consultation.',
    description: 'KlinikAI helps general practitioners surface relevant clinical guidelines and recent research during a 10-minute consultation. We use retrieval-augmented generation over public medical guidelines and patient summaries (with consent). Pilot planned with two clinics in Istanbul.',
    category: 'HEALTH', stage: 'MVP', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: 'İstanbul, TR', weekly_commitment_min: 4, weekly_commitment_max: 10,
    github_url: 'https://github.com/builderclans/klinik-ai', demo_url: null, website_url: null,
    tags: ['AI', 'HealthTech', 'Clinical'], status: 'ACTIVE',
  },
  {
    id: 'prj_000002', owner_id: 'usr_002', slug: 'agentmesh',
    title: 'AgentMesh — orchestrator for multi-agent LLM pipelines',
    short_description: 'Open-source framework to compose LLM agents with explicit data flow and cost budgets.',
    description: 'AgentMesh is a thin orchestration layer for multi-agent LLM pipelines. Think: explicit DAG, retry policies, per-node cost budgets, observability. Targets teams that already have agents and want to compose them without losing visibility.',
    category: 'DEVELOPER_TOOLS', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 6, weekly_commitment_max: 10,
    github_url: 'https://github.com/agentmesh/agentmesh', demo_url: null, website_url: null,
    tags: ['AI', 'Open Source', 'Developer Tools'], status: 'ACTIVE',
  },
  {
    id: 'prj_000003', owner_id: 'usr_003', slug: 'meydan-marketplace',
    title: 'Meydan — local services marketplace',
    short_description: 'Two-sided marketplace for neighborhood services: plumbers, tutors, dog walkers.',
    description: 'Meydan is a two-sided marketplace for neighborhood services. We focus on trust (verified profiles, escrow) and supply density. MVP live in Kadıköy with 80 providers and 600 active users.',
    category: 'MARKETPLACE', stage: 'GROWTH', visibility: 'PUBLIC', remote_mode: 'FLEXIBLE',
    location: 'İstanbul, TR', weekly_commitment_min: 10, weekly_commitment_max: 20,
    github_url: null, demo_url: 'https://meydan.example.com', website_url: 'https://meydan.example.com',
    tags: ['Marketplace', 'Local', 'Trust'], status: 'ACTIVE',
  },
  {
    id: 'prj_000004', owner_id: 'usr_007', slug: 'prothesis-lowcost',
    title: 'Affordable prosthetics — low-cost 3D-printed hand',
    short_description: 'Open-source design files + fitting app for low-cost 3D-printed prosthetic hands.',
    description: 'We design and distribute low-cost 3D-printed prosthetic hands. The software stack includes a fitting app (mobile), a shared STL library, and a clinic toolkit. Currently piloting with two rehabilitation centers.',
    category: 'HARDWARE', stage: 'PROTOTYPE', visibility: 'PUBLIC', remote_mode: 'FLEXIBLE',
    location: 'Ankara, TR', weekly_commitment_min: 6, weekly_commitment_max: 15,
    github_url: 'https://github.com/openhand/project', demo_url: null, website_url: null,
    tags: ['Hardware', 'HealthTech', 'Open Source'], status: 'ACTIVE',
  },
  {
    id: 'prj_000005', owner_id: 'usr_006', slug: 'infra-boring',
    title: 'BoringStack — opinionated infrastructure starter',
    short_description: 'A boring infrastructure starter: Terraform + GitHub Actions + minimal observability.',
    description: 'BoringStack is a Terraform + GitHub Actions starter for small teams that want reliable infrastructure without 200 settings. Includes cost alerts, basic SLOs, and a runbook template.',
    category: 'DEVELOPER_TOOLS', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 2, weekly_commitment_max: 6,
    github_url: null, demo_url: null, website_url: null,
    tags: ['DevOps', 'Terraform', 'Open Source'], status: 'ACTIVE',
  },
  {
    id: 'prj_000006', owner_id: 'usr_020', slug: 'dershane-os',
    title: 'DershaneOS — operating system for small tutoring centers',
    short_description: 'All-in-one OS for small tutoring centers: scheduling, billing, parent comms.',
    description: 'DershaneOS is an all-in-one operating system for small tutoring centers. Scheduling, billing, attendance, parent communication — all in one. Currently 5 paying customers.',
    category: 'EDUCATION', stage: 'MVP', visibility: 'PUBLIC', remote_mode: 'FLEXIBLE',
    location: 'İstanbul, TR', weekly_commitment_min: 10, weekly_commitment_max: 20,
    github_url: null, demo_url: 'https://dershane.example.com', website_url: 'https://dershane.example.com',
    tags: ['EdTech', 'SaaS', 'Scheduling'], status: 'ACTIVE',
  },
  {
    id: 'prj_000007', owner_id: 'usr_009', slug: 'trialbot',
    title: 'TrialBot — automated clinical trial matching',
    short_description: 'NLP over public trial registries to match patients with relevant trials.',
    description: 'TrialBot extracts eligibility criteria from public trial registries and matches patient profiles (consented) to relevant trials. We focus on Turkish trials first.',
    category: 'HEALTH', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: 'Ankara, TR', weekly_commitment_min: 4, weekly_commitment_max: 8,
    github_url: null, demo_url: null, website_url: null,
    tags: ['AI', 'HealthTech', 'NLP'], status: 'ACTIVE',
  },
  {
    id: 'prj_000008', owner_id: 'usr_010', slug: 'fitcircles',
    title: 'FitCircles — small-group fitness accountability',
    short_description: 'Mobile app: small private fitness groups with weekly challenges and shared progress.',
    description: 'FitCircles is a mobile app for small private fitness groups (3-8 friends). Weekly challenges, shared progress, no public feed. Built in React Native.',
    category: 'HEALTH', stage: 'MVP', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 6, weekly_commitment_max: 12,
    github_url: 'https://github.com/fitcircles/app', demo_url: null, website_url: null,
    tags: ['HealthTech', 'Fitness', 'Mobile'], status: 'ACTIVE',
  },
  {
    id: 'prj_000009', owner_id: 'usr_011', slug: 'paperflow',
    title: 'Paperflow — academic writing co-pilot',
    short_description: 'A writing tool that helps researchers structure papers and track citations.',
    description: 'Paperflow helps researchers structure papers, track citations, and stay in flow. The MVP is a web editor with citation graph and outline mode.',
    category: 'EDUCATION', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 2, weekly_commitment_max: 6,
    github_url: null, demo_url: null, website_url: null,
    tags: ['EdTech', 'Research', 'Productivity'], status: 'ACTIVE',
  },
  {
    id: 'prj_000010', owner_id: 'usr_014', slug: 'ledger-mini',
    title: 'LedgerMini — lightweight personal finance',
    short_description: 'Privacy-first personal finance app. No bank integrations, just manual entry + smart categories.',
    description: 'LedgerMini is a privacy-first personal finance app. No bank integrations, just manual entry and smart category suggestions. Lives in the browser, syncs via end-to-end encrypted cloud.',
    category: 'FINANCE', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 4, weekly_commitment_max: 8,
    github_url: null, demo_url: null, website_url: null,
    tags: ['FinTech', 'Privacy', 'Productivity'], status: 'ACTIVE',
  },
  {
    id: 'prj_000011', owner_id: 'usr_017', slug: 'butce-robo',
    title: 'BütçeRobo — budgeting coach for Turkish households',
    short_description: 'SMS-based budgeting coach for Turkish households, in Turkish.',
    description: 'BütçeRobo is an SMS-based budgeting coach. Users text their expenses, the bot categorizes and replies with a weekly summary. Designed for people who don\'t want yet another app.',
    category: 'FINANCE', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: 'İstanbul, TR', weekly_commitment_min: 2, weekly_commitment_max: 6,
    github_url: null, demo_url: null, website_url: null,
    tags: ['FinTech', 'Chat', 'Inclusive'], status: 'ACTIVE',
  },
  {
    id: 'prj_000012', owner_id: 'usr_015', slug: 'kod-akademi',
    title: 'KodAkademi — game-based CS learning for high-schoolers',
    short_description: 'Educational game where high-schoolers learn CS basics through building a virtual city.',
    description: 'KodAkademi is an educational game for high-schoolers. They learn programming basics by scripting a virtual city — events, automation, and small AI. Built in Unity.',
    category: 'EDUCATION', stage: 'PROTOTYPE', visibility: 'PUBLIC', remote_mode: 'FLEXIBLE',
    location: 'İstanbul, TR', weekly_commitment_min: 4, weekly_commitment_max: 10,
    github_url: 'https://github.com/kodakademi/game', demo_url: null, website_url: null,
    tags: ['EdTech', 'Games', 'CS Education'], status: 'ACTIVE',
  },
  {
    id: 'prj_000013', owner_id: 'usr_018', slug: 'protein-forge',
    title: 'ProteinForge — open protein design tooling',
    short_description: 'Open tooling for protein design experiments: dataset prep, model eval, design iteration.',
    description: 'ProteinForge is an open toolkit for protein design experiments. Dataset preparation, baseline models, eval harness, design iteration. Targets academic labs without big ML infra.',
    category: 'AI_ML', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: 'Ankara, TR', weekly_commitment_min: 6, weekly_commitment_max: 12,
    github_url: 'https://github.com/proteinforge/forge', demo_url: null, website_url: null,
    tags: ['AI', 'Bio', 'Open Source'], status: 'ACTIVE',
  },
  {
    id: 'prj_000014', owner_id: 'usr_021', slug: 'pgp-mail',
    title: 'PGPMail — easy end-to-end encrypted email for everyone',
    short_description: 'A friendly, audited end-to-end encrypted email client.',
    description: 'PGPMail is a friendly, audited end-to-end encrypted email client. Built for people who want privacy without learning key management. Audited by an external firm.',
    category: 'SECURITY', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 4, weekly_commitment_max: 10,
    github_url: null, demo_url: null, website_url: null,
    tags: ['Privacy', 'Email', 'Security'], status: 'ACTIVE',
  },
  {
    id: 'prj_000015', owner_id: 'usr_022', slug: 'b2b-tribe',
    title: 'B2BTribe — peer groups for B2B founders',
    short_description: 'Curated peer groups for B2B founders. 8 people, monthly meetings, real numbers.',
    description: 'B2BTribe runs curated peer groups for B2B founders. 8 founders per group, monthly meetings, real numbers shared under NDA. We make the matching and the runbooks.',
    category: 'OTHER', stage: 'MVP', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 6, weekly_commitment_max: 12,
    github_url: null, demo_url: 'https://b2btribe.example.com', website_url: 'https://b2btribe.example.com',
    tags: ['Community', 'B2B', 'Founders'], status: 'ACTIVE',
  },
  {
    id: 'prj_000016', owner_id: 'usr_023', slug: 'iot-soil',
    title: 'IoT Soil — affordable soil sensors for small farms',
    short_description: 'Low-cost soil moisture + pH sensors with a simple web dashboard.',
    description: 'IoT Soil is a low-cost soil sensor kit (moisture + pH) for small farms. Cellular backhaul, simple web dashboard, alert rules. Currently piloting with 4 farms.',
    category: 'HARDWARE', stage: 'PROTOTYPE', visibility: 'PUBLIC', remote_mode: 'FLEXIBLE',
    location: 'İzmir, TR', weekly_commitment_min: 4, weekly_commitment_max: 10,
    github_url: 'https://github.com/iotsoil/firmware', demo_url: null, website_url: null,
    tags: ['IoT', 'AgriTech', 'Hardware'], status: 'ACTIVE',
  },
  {
    id: 'prj_000017', owner_id: 'usr_024', slug: 'studio-os',
    title: 'StudioOS — operations for small design studios',
    short_description: 'A small tool for design studios: project tracking, time, invoicing.',
    description: 'StudioOS is operations software for small design studios. Project tracking, time entries, invoicing, client portal. Self-hosted, no per-seat fees.',
    category: 'OTHER', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 4, weekly_commitment_max: 8,
    github_url: null, demo_url: null, website_url: null,
    tags: ['Productivity', 'Design', 'SaaS'], status: 'ACTIVE',
  },
  {
    id: 'prj_000018', owner_id: 'usr_025', slug: 'healthship',
    title: 'HealthShip — last-mile medical logistics',
    short_description: 'Last-mile medical delivery: from hospital pharmacy to home, temperature-controlled.',
    description: 'HealthShip is a last-mile medical logistics service. Hospital pharmacy to home, temperature-controlled, with chain-of-custody proof.',
    category: 'OTHER', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'IN_PERSON',
    location: 'İstanbul, TR', weekly_commitment_min: 10, weekly_commitment_max: 20,
    github_url: null, demo_url: null, website_url: null,
    tags: ['Logistics', 'HealthTech', 'Operations'], status: 'ACTIVE',
  },
  {
    id: 'prj_000019', owner_id: 'usr_026', slug: 'habitly',
    title: 'Habitly — quiet habit tracker',
    short_description: 'A no-streaks habit tracker. Just track, no shame, no badges.',
    description: 'Habitly is a quiet habit tracker. No streaks, no shame, no badges. Just a record of what you did. Privacy-first, no account required.',
    category: 'HEALTH', stage: 'IDEA', visibility: 'PUBLIC', remote_mode: 'REMOTE_FIRST',
    location: null, weekly_commitment_min: 2, weekly_commitment_max: 6,
    github_url: 'https://github.com/habitly/app', demo_url: null, website_url: null,
    tags: ['HealthTech', 'Productivity', 'Privacy'], status: 'ACTIVE',
  },
  {
    id: 'prj_000020', owner_id: 'usr_028', slug: 'rx-watch',
    title: 'RxWatch — adverse drug reaction reporting',
    short_description: 'Mobile app for doctors to report and query adverse drug reactions.',
    description: 'RxWatch is a mobile app for doctors to report and query adverse drug reactions. We aggregate anonymized reports and surface patterns. Pilot with 2 hospitals.',
    category: 'HEALTH', stage: 'PROTOTYPE', visibility: 'PUBLIC', remote_mode: 'FLEXIBLE',
    location: 'Ankara, TR', weekly_commitment_min: 4, weekly_commitment_max: 10,
    github_url: null, demo_url: null, website_url: null,
    tags: ['HealthTech', 'Mobile', 'Pharmacovigilance'], status: 'ACTIVE',
  },
];

// --- Project roles (15) ---

const PROJECT_ROLES: ProjectRole[] = [
  // KlinikAI
  { id: 'prl_000001', project_id: 'prj_000001', title: 'CTO / Technical co-founder', description: 'Architect and lead the engineering. Must be comfortable with retrieval + production LLM apps.', commitment_min: 10, commitment_max: 20, experience_level: 'SENIOR', required_skills: ['Python', 'LLM', 'Backend'], status: 'OPEN' },
  { id: 'prl_000002', project_id: 'prj_000001', title: 'Mobile engineer (Flutter)', description: 'Build the patient-facing companion app. Offline-first, low-spec Android.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Flutter', 'Mobile'], status: 'OPEN' },
  // AgentMesh
  { id: 'prl_000003', project_id: 'prj_000002', title: 'DX / Developer advocate', description: 'Write the docs, build the examples, run the Discord. OSS experience required.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Developer Relations', 'Writing'], status: 'OPEN' },
  // Meydan
  { id: 'prl_000004', project_id: 'prj_000003', title: 'Mobile engineer (React Native)', description: 'Lead the React Native rewrite of the consumer app. Currently 600 users.', commitment_min: 10, commitment_max: 15, experience_level: 'MID', required_skills: ['React Native', 'TypeScript'], status: 'OPEN' },
  { id: 'prl_000005', project_id: 'prj_000003', title: 'Operations / community manager', description: 'Run supply-side ops: onboard providers, manage support, set quality bar.', commitment_min: 6, commitment_max: 10, experience_level: 'JUNIOR', required_skills: ['Operations', 'Community'], status: 'OPEN' },
  // Prosthetics
  { id: 'prl_000006', project_id: 'prj_000004', title: 'Mobile engineer (Flutter)', description: 'Build the fitting app that guides the clinician through measurements.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Flutter', 'Mobile'], status: 'OPEN' },
  // DershaneOS
  { id: 'prl_000007', project_id: 'prj_000006', title: 'Full-stack engineer', description: 'TypeScript + Postgres. Help us scale from 5 to 50 customers.', commitment_min: 6, commitment_max: 10, experience_level: 'MID', required_skills: ['TypeScript', 'Postgres'], status: 'OPEN' },
  // TrialBot
  { id: 'prl_000008', project_id: 'prj_000007', title: 'Backend engineer (Python)', description: 'Build the trial registry scraper + matching service.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Python', 'NLP'], status: 'OPEN' },
  // FitCircles
  { id: 'prl_000009', project_id: 'prj_000008', title: 'Backend engineer', description: 'Node + Postgres. Push notifications, group logic.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Node.js', 'Postgres'], status: 'OPEN' },
  // Paperflow
  { id: 'prl_000010', project_id: 'prj_000009', title: 'Product designer', description: 'Design the writing UI from scratch. Strong opinions on editors welcome.', commitment_min: 4, commitment_max: 8, experience_level: 'SENIOR', required_skills: ['Product Design', 'Figma'], status: 'OPEN' },
  // LedgerMini
  { id: 'prl_000011', project_id: 'prj_000010', title: 'Full-stack engineer', description: 'TypeScript + Postgres. Encryption-first.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['TypeScript', 'Postgres'], status: 'OPEN' },
  // ProteinForge
  { id: 'prl_000012', project_id: 'prj_000013', title: 'ML engineer (PyTorch)', description: 'Baseline models + eval harness for protein design.', commitment_min: 6, commitment_max: 12, experience_level: 'SENIOR', required_skills: ['PyTorch', 'Python'], status: 'OPEN' },
  // IoT Soil
  { id: 'prl_000013', project_id: 'prj_000016', title: 'Embedded engineer', description: 'Firmware for the sensor node. ESP-IDF or Arduino.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Embedded', 'C'], status: 'OPEN' },
  // RxWatch
  { id: 'prl_000014', project_id: 'prj_000020', title: 'Mobile engineer (iOS + Android)', description: 'React Native. Doctor-facing reporting form.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['React Native', 'Mobile'], status: 'OPEN' },
  // KodAkademi
  { id: 'prl_000015', project_id: 'prj_000012', title: 'Game designer', description: 'Design the city-building mechanics for high-schoolers.', commitment_min: 4, commitment_max: 8, experience_level: 'MID', required_skills: ['Game Design', 'Unity'], status: 'OPEN' },
];

// --- Project skills (relate projects to canonical skills) ---

const PROJECT_SKILLS: Array<{ project_id: string; skill: string }> = [
  { project_id: 'prj_000001', skill: 'AI' }, { project_id: 'prj_000001', skill: 'HealthTech' }, { project_id: 'prj_000001', skill: 'Python' },
  { project_id: 'prj_000002', skill: 'AI' }, { project_id: 'prj_000002', skill: 'Open Source' }, { project_id: 'prj_000002', skill: 'Python' },
  { project_id: 'prj_000003', skill: 'Marketplace' }, { project_id: 'prj_000003', skill: 'TypeScript' },
  { project_id: 'prj_000004', skill: 'Hardware' }, { project_id: 'prj_000004', skill: 'HealthTech' }, { project_id: 'prj_000004', skill: '3D Modeling' },
  { project_id: 'prj_000005', skill: 'DevOps' }, { project_id: 'prj_000005', skill: 'Backend' },
  { project_id: 'prj_000006', skill: 'EdTech' }, { project_id: 'prj_000006', skill: 'TypeScript' },
  { project_id: 'prj_000007', skill: 'AI' }, { project_id: 'prj_000007', skill: 'HealthTech' }, { project_id: 'prj_000007', skill: 'Python' },
  { project_id: 'prj_000008', skill: 'HealthTech' }, { project_id: 'prj_000008', skill: 'Mobile' }, { project_id: 'prj_000008', skill: 'React Native' },
  { project_id: 'prj_000009', skill: 'EdTech' }, { project_id: 'prj_000009', skill: 'Product Design' },
  { project_id: 'prj_000010', skill: 'FinTech' }, { project_id: 'prj_000010', skill: 'TypeScript' },
  { project_id: 'prj_000011', skill: 'FinTech' }, { project_id: 'prj_000011', skill: 'Backend' },
  { project_id: 'prj_000012', skill: 'EdTech' }, { project_id: 'prj_000012', skill: 'Games' }, { project_id: 'prj_000012', skill: 'Unity' },
  { project_id: 'prj_000013', skill: 'AI' }, { project_id: 'prj_000013', skill: 'PyTorch' }, { project_id: 'prj_000013', skill: 'Python' },
  { project_id: 'prj_000014', skill: 'Privacy' }, { project_id: 'prj_000014', skill: 'Security' },
  { project_id: 'prj_000015', skill: 'Community' }, { project_id: 'prj_000015', skill: 'Marketing' },
  { project_id: 'prj_000016', skill: 'Hardware' }, { project_id: 'prj_000016', skill: 'IoT' }, { project_id: 'prj_000016', skill: 'C' },
  { project_id: 'prj_000017', skill: 'Productivity' }, { project_id: 'prj_000017', skill: 'Product Design' },
  { project_id: 'prj_000018', skill: 'HealthTech' }, { project_id: 'prj_000018', skill: 'Logistics' },
  { project_id: 'prj_000019', skill: 'HealthTech' }, { project_id: 'prj_000019', skill: 'Mobile' },
  { project_id: 'prj_000020', skill: 'HealthTech' }, { project_id: 'prj_000020', skill: 'Mobile' },
];

// --- Project members (owners and a few existing collaborators) ---

const PROJECT_MEMBERS: ProjectMember[] = PROJECTS.map((p) => ({
  id: `pmb_${p.id.slice(4)}`,
  project_id: p.id,
  user_id: p.owner_id,
  member_type: 'OWNER',
  status: 'ACTIVE',
  role_title: 'Founder',
  joined_at: DAYS_AGO(40),
  left_at: null,
})).concat([
  { id: 'pmb_000002', project_id: 'prj_000001', user_id: 'usr_028', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'Medical advisor', joined_at: DAYS_AGO(30), left_at: null },
  { id: 'pmb_000003', project_id: 'prj_000004', user_id: 'usr_004', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'Industrial designer', joined_at: DAYS_AGO(20), left_at: null },
  { id: 'pmb_000004', project_id: 'prj_000003', user_id: 'usr_005', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'Marketing', joined_at: DAYS_AGO(35), left_at: null },
  { id: 'pmb_000005', project_id: 'prj_000008', user_id: 'usr_005', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'Marketing', joined_at: DAYS_AGO(15), left_at: null },
  { id: 'pmb_000006', project_id: 'prj_000006', user_id: 'usr_017', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'Backend', joined_at: DAYS_AGO(25), left_at: null },
  { id: 'pmb_000007', project_id: 'prj_000012', user_id: 'usr_024', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'Brand designer', joined_at: DAYS_AGO(10), left_at: null },
  { id: 'pmb_000008', project_id: 'prj_000002', user_id: 'usr_027', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'OSS maintainer', joined_at: DAYS_AGO(5), left_at: null },
  { id: 'pmb_000009', project_id: 'prj_000005', user_id: 'usr_012', member_type: 'COLLABORATOR', status: 'ACTIVE', role_title: 'DevOps', joined_at: DAYS_AGO(7), left_at: null },
]);

// --- Applications (15) ---

const APPLICATIONS: Application[] = [
  { id: 'app_000001', project_id: 'prj_000001', role_id: 'prl_000001', applicant_id: 'usr_002', why_interested: 'I want to apply retrieval + LLM to clinical decision support. Have done retrieval before.', contribution: 'Architect the retrieval pipeline and lead the engineering.', hours_per_week: 10, relevant_work_url: 'https://github.com/kayra/agentic', note: null, status: 'PENDING', created_at: DAYS_AGO(3), decided_at: null },
  { id: 'app_000002', project_id: 'prj_000001', role_id: 'prl_000001', applicant_id: 'usr_006', why_interested: 'Backend + production systems is what I do for a living. Healthcare feels meaningful.', contribution: 'Backend architecture, infra, and rollout.', hours_per_week: 8, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(2), decided_at: null },
  { id: 'app_000003', project_id: 'prj_000002', role_id: 'prl_000003', applicant_id: 'usr_013', why_interested: 'I love writing technical content and would love to make agent orchestration accessible.', contribution: 'Docs, examples, and run a Discord community.', hours_per_week: 4, relevant_work_url: 'https://medium.com/@ayse', note: null, status: 'PENDING', created_at: DAYS_AGO(1), decided_at: null },
  { id: 'app_000004', project_id: 'prj_000003', role_id: 'prl_000004', applicant_id: 'usr_010', why_interested: 'I shipped a fitness app with RN. 50k downloads. Want to apply that here.', contribution: 'Lead the consumer app rewrite.', hours_per_week: 12, relevant_work_url: 'https://github.com/burak/fitcircles', note: null, status: 'PENDING', created_at: DAYS_AGO(2), decided_at: null },
  { id: 'app_000005', project_id: 'prj_000003', role_id: 'prl_000005', applicant_id: 'usr_020', why_interested: 'I run operations for a small business. Marketplace ops feels natural.', contribution: 'Provider onboarding and support.', hours_per_week: 8, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(4), decided_at: null },
  { id: 'app_000006', project_id: 'prj_000004', role_id: 'prl_000006', applicant_id: 'usr_010', why_interested: 'I want to build something that matters. RN experience helps.', contribution: 'Lead the fitting app.', hours_per_week: 6, relevant_work_url: 'https://github.com/burak/fitcircles', note: null, status: 'PENDING', created_at: DAYS_AGO(2), decided_at: null },
  { id: 'app_000007', project_id: 'prj_000006', role_id: 'prl_000007', applicant_id: 'usr_003', why_interested: 'Full-stack TS, have shipped marketplace MVPs.', contribution: 'Build the customer onboarding flow + billing.', hours_per_week: 8, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(1), decided_at: null },
  { id: 'app_000008', project_id: 'prj_000007', role_id: 'prl_000008', applicant_id: 'usr_002', why_interested: 'NLP over clinical text is exactly my kind of work.', contribution: 'Build the scraper + matching service.', hours_per_week: 6, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(3), decided_at: null },
  { id: 'app_000009', project_id: 'prj_000009', role_id: 'prl_000010', applicant_id: 'usr_011', why_interested: 'I designed editors at my last job. I care about writing tools.', contribution: 'Lead product design.', hours_per_week: 6, relevant_work_url: 'https://dribbble.com/pelin', note: null, status: 'PENDING', created_at: DAYS_AGO(2), decided_at: null },
  { id: 'app_000010', project_id: 'prj_000013', role_id: 'prl_000012', applicant_id: 'usr_009', why_interested: 'I want to apply ML to bio. I have the PyTorch chops.', contribution: 'Baseline models + eval.', hours_per_week: 8, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(1), decided_at: null },
  { id: 'app_000011', project_id: 'prj_000016', role_id: 'prl_000013', applicant_id: 'usr_023', why_interested: 'Embedded is literally my day job.', contribution: 'Firmware for the sensor node.', hours_per_week: 6, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(2), decided_at: null },
  { id: 'app_000012', project_id: 'prj_000020', role_id: 'prl_000014', applicant_id: 'usr_026', why_interested: 'I built a habit tracker. Hospital apps feel like a natural next step.', contribution: 'Lead the mobile build.', hours_per_week: 6, relevant_work_url: 'https://github.com/merve/habitly', note: null, status: 'PENDING', created_at: DAYS_AGO(1), decided_at: null },
  { id: 'app_000013', project_id: 'prj_000012', role_id: 'prl_000015', applicant_id: 'usr_015', why_interested: 'It is my project :) Need a designer to elevate it.', contribution: 'Help shape the city mechanics.', hours_per_week: 4, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(3), decided_at: null },
  { id: 'app_000014', project_id: 'prj_000001', role_id: 'prl_000002', applicant_id: 'usr_010', why_interested: 'Mobile is my thing. Want to build a useful patient companion.', contribution: 'Build the companion app.', hours_per_week: 4, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(2), decided_at: null },
  { id: 'app_000015', project_id: 'prj_000010', role_id: 'prl_000011', applicant_id: 'usr_003', why_interested: 'Privacy-first is exactly my vibe. E2E encryption is something I want to learn.', contribution: 'Build the syncing engine + UI.', hours_per_week: 6, relevant_work_url: null, note: null, status: 'PENDING', created_at: DAYS_AGO(1), decided_at: null },
];

// --- Matches (10) — AI-narrated scoring ---

const MATCHES: Match[] = [
  { id: 'mch_000001', project_id: 'prj_000001', role_id: 'prl_000001', initiator_user_id: 'usr_001', candidate_user_id: 'usr_002', status: 'SUGGESTED', final_score: 0.86, created_at: DAYS_AGO(3), updated_at: DAYS_AGO(3) },
  { id: 'mch_000002', project_id: 'prj_000001', role_id: 'prl_000001', initiator_user_id: 'usr_001', candidate_user_id: 'usr_006', status: 'SUGGESTED', final_score: 0.74, created_at: DAYS_AGO(2), updated_at: DAYS_AGO(2) },
  { id: 'mch_000003', project_id: 'prj_000003', role_id: 'prl_000004', initiator_user_id: 'usr_003', candidate_user_id: 'usr_010', status: 'MUTUAL_INTEREST', final_score: 0.81, created_at: DAYS_AGO(2), updated_at: DAYS_AGO(2) },
  { id: 'mch_000004', project_id: 'prj_000004', role_id: 'prl_000006', initiator_user_id: 'usr_007', candidate_user_id: 'usr_010', status: 'MUTUAL_INTEREST', final_score: 0.78, created_at: DAYS_AGO(2), updated_at: DAYS_AGO(2) },
  { id: 'mch_000005', project_id: 'prj_000006', role_id: 'prl_000007', initiator_user_id: 'usr_020', candidate_user_id: 'usr_003', status: 'SUGGESTED', final_score: 0.83, created_at: DAYS_AGO(1), updated_at: DAYS_AGO(1) },
  { id: 'mch_000006', project_id: 'prj_000013', role_id: 'prl_000012', initiator_user_id: 'usr_018', candidate_user_id: 'usr_009', status: 'MUTUAL_INTEREST', final_score: 0.89, created_at: DAYS_AGO(1), updated_at: DAYS_AGO(1) },
  { id: 'mch_000007', project_id: 'prj_000016', role_id: 'prl_000013', initiator_user_id: 'usr_023', candidate_user_id: 'usr_007', status: 'SUGGESTED', final_score: 0.71, created_at: DAYS_AGO(2), updated_at: DAYS_AGO(2) },
  { id: 'mch_000008', project_id: 'prj_000012', role_id: 'prl_000015', initiator_user_id: 'usr_015', candidate_user_id: 'usr_024', status: 'MUTUAL_INTEREST', final_score: 0.79, created_at: DAYS_AGO(3), updated_at: DAYS_AGO(3) },
  { id: 'mch_000009', project_id: 'prj_000020', role_id: 'prl_000014', initiator_user_id: 'usr_028', candidate_user_id: 'usr_026', status: 'MUTUAL_INTEREST', final_score: 0.82, created_at: DAYS_AGO(1), updated_at: DAYS_AGO(1) },
  { id: 'mch_000010', project_id: 'prj_000010', role_id: 'prl_000011', initiator_user_id: 'usr_014', candidate_user_id: 'usr_003', status: 'SUGGESTED', final_score: 0.75, created_at: DAYS_AGO(1), updated_at: DAYS_AGO(1) },
];

const MATCH_SCORES: MatchScore[] = MATCHES.map((m, i) => ({
  id: `msc_${String(i + 1).padStart(6, '0')}`,
  match_id: m.id,
  skill_score: 70 + i * 2,
  interest_score: 80 - i,
  role_score: 85 - i,
  availability_score: 70 + (i % 3) * 5,
  commitment_score: 80,
  experience_score: 65 + (i % 4) * 5,
  location_score: 75,
  reputation_score: 70,
  final_score: m.final_score ?? 0.75,
  explanation_json: null,
  created_at: m.created_at,
}));

// --- Trials (4) — ACTIVE and one COMPLETED ---

const TRIALS: Trial[] = [
  {
    id: 'trl_000001', project_id: 'prj_000001', role_id: 'prl_000001', match_id: 'mch_000001',
    owner_id: 'usr_001', status: 'ACTIVE',
    goal: 'Deliver a working retrieval-augmented guideline lookup for one clinical scenario.',
    deliverables: ['Index of Turkish clinical guidelines', 'Working RAG demo', 'One-page technical writeup'],
    duration_days: 14, starts_at: DAYS_AGO(7), ends_at: HOURS_FROM_NOW(7 * 24),
  },
  {
    id: 'trl_000002', project_id: 'prj_000013', role_id: 'prl_000012', match_id: 'mch_000006',
    owner_id: 'usr_018', status: 'ACTIVE',
    goal: 'Set up the dataset prep + baseline eval harness for the protein design task.',
    deliverables: ['Dataset loader', 'Two baseline models', 'Eval harness with 3 metrics'],
    duration_days: 14, starts_at: DAYS_AGO(5), ends_at: HOURS_FROM_NOW(9 * 24),
  },
  {
    id: 'trl_000003', project_id: 'prj_000012', role_id: 'prl_000015', match_id: 'mch_000008',
    owner_id: 'usr_015', status: 'ACTIVE',
    goal: 'Design + prototype the city-building core loop and progression.',
    deliverables: ['Core loop doc', '3 levels designed', 'Prototype in Figma'],
    duration_days: 7, starts_at: DAYS_AGO(3), ends_at: HOURS_FROM_NOW(4 * 24),
  },
  {
    id: 'trl_000004', project_id: 'prj_000006', role_id: 'prl_000007', match_id: 'mch_000005',
    owner_id: 'usr_020', status: 'COMPLETED',
    goal: 'Ship a basic customer onboarding + billing flow.',
    deliverables: ['Onboarding flow', 'Billing integration', 'Documentation'],
    duration_days: 7, starts_at: DAYS_AGO(20), ends_at: DAYS_AGO(13),
  },
];

const TRIAL_MEMBERS: TrialMember[] = [
  // Active trials — owner + collaborator
  { id: 'tmb_000001', trial_id: 'trl_000001', user_id: 'usr_001', role: 'OWNER', status: 'ACTIVE', joined_at: DAYS_AGO(7) },
  { id: 'tmb_000002', trial_id: 'trl_000001', user_id: 'usr_002', role: 'COLLABORATOR', status: 'ACTIVE', joined_at: DAYS_AGO(7) },
  { id: 'tmb_000003', trial_id: 'trl_000002', user_id: 'usr_018', role: 'OWNER', status: 'ACTIVE', joined_at: DAYS_AGO(5) },
  { id: 'tmb_000004', trial_id: 'trl_000002', user_id: 'usr_009', role: 'COLLABORATOR', status: 'ACTIVE', joined_at: DAYS_AGO(5) },
  { id: 'tmb_000005', trial_id: 'trl_000003', user_id: 'usr_015', role: 'OWNER', status: 'ACTIVE', joined_at: DAYS_AGO(3) },
  { id: 'tmb_000006', trial_id: 'trl_000003', user_id: 'usr_024', role: 'COLLABORATOR', status: 'ACTIVE', joined_at: DAYS_AGO(3) },
  // Completed
  { id: 'tmb_000007', trial_id: 'trl_000004', user_id: 'usr_020', role: 'OWNER', status: 'LEFT', joined_at: DAYS_AGO(20) },
  { id: 'tmb_000008', trial_id: 'trl_000004', user_id: 'usr_003', role: 'COLLABORATOR', status: 'LEFT', joined_at: DAYS_AGO(20) },
];

// --- Tasks & milestones for active trials ---

const TASKS: Task[] = [
  // Trial 1
  { id: 'tsk_000001', project_id: 'prj_000001', trial_id: 'trl_000001', milestone_id: null, title: 'Index 50 most-cited Turkish guidelines', description: 'Pick the 50 most-cited guidelines from saglik.gov.tr and add to the index.', status: 'DONE', priority: 'HIGH', assignee_id: 'usr_002', due_date: DAYS_AGO(2), created_by: 'usr_001', created_at: DAYS_AGO(7), updated_at: DAYS_AGO(2) },
  { id: 'tsk_000002', project_id: 'prj_000001', trial_id: 'trl_000001', milestone_id: null, title: 'Build the retrieval pipeline', description: 'Embedding + retrieval over the indexed guidelines. Should respond in <2s.', status: 'IN_PROGRESS', priority: 'HIGH', assignee_id: 'usr_002', due_date: HOURS_FROM_NOW(2 * 24), created_by: 'usr_001', created_at: DAYS_AGO(5), updated_at: DAYS_AGO(1) },
  { id: 'tsk_000003', project_id: 'prj_000001', trial_id: 'trl_000001', milestone_id: null, title: 'Write the technical writeup', description: 'One page on what we did, what we learned, what is next.', status: 'TODO', priority: 'MEDIUM', assignee_id: 'usr_001', due_date: HOURS_FROM_NOW(6 * 24), created_by: 'usr_001', created_at: DAYS_AGO(3), updated_at: DAYS_AGO(3) },
  // Trial 2
  { id: 'tsk_000004', project_id: 'prj_000013', trial_id: 'trl_000002', milestone_id: null, title: 'Dataset loader (PDB + SwissProt)', description: 'Loader that can pull + clean the datasets for our task.', status: 'IN_PROGRESS', priority: 'HIGH', assignee_id: 'usr_009', due_date: HOURS_FROM_NOW(3 * 24), created_by: 'usr_018', created_at: DAYS_AGO(5), updated_at: DAYS_AGO(1) },
  { id: 'tsk_000005', project_id: 'prj_000013', trial_id: 'trl_000002', milestone_id: null, title: 'Baseline model A: simple CNN', description: 'Get a working baseline so we can measure improvements against it.', status: 'TODO', priority: 'HIGH', assignee_id: 'usr_009', due_date: HOURS_FROM_NOW(7 * 24), created_by: 'usr_018', created_at: DAYS_AGO(3), updated_at: DAYS_AGO(3) },
  // Trial 3
  { id: 'tsk_000006', project_id: 'prj_000012', trial_id: 'trl_000003', milestone_id: null, title: 'Document the core loop', description: 'One-pager: what is the player doing, what is the system doing.', status: 'DONE', priority: 'HIGH', assignee_id: 'usr_024', due_date: DAYS_AGO(1), created_by: 'usr_015', created_at: DAYS_AGO(3), updated_at: DAYS_AGO(1) },
  { id: 'tsk_000007', project_id: 'prj_000012', trial_id: 'trl_000003', milestone_id: null, title: 'Design 3 levels', description: 'Three levels of progression with clear teaching moments.', status: 'IN_PROGRESS', priority: 'HIGH', assignee_id: 'usr_024', due_date: HOURS_FROM_NOW(2 * 24), created_by: 'usr_015', created_at: DAYS_AGO(2), updated_at: DAYS_AGO(1) },
];

const MILESTONES: Milestone[] = [
  // Project-level milestones for completed trial 4 (post-ship)
  { id: 'mst_000001', project_id: 'prj_000006', title: 'Onboard 10 paying customers', description: 'Get to 10 paying customers for DershaneOS.', status: 'IN_PROGRESS', target_date: HOURS_FROM_NOW(30 * 24), completed_at: null, created_at: DAYS_AGO(40) },
  { id: 'mst_000002', project_id: 'prj_000006', title: 'Add parent portal', description: 'A simple parent-facing portal for grades and announcements.', status: 'OPEN', target_date: HOURS_FROM_NOW(60 * 24), completed_at: null, created_at: DAYS_AGO(20) },
  { id: 'mst_000003', project_id: 'prj_000001', title: 'Run pilot with one clinic', description: 'Get one GP clinic to use the MVP for a week.', status: 'OPEN', target_date: HOURS_FROM_NOW(45 * 24), completed_at: null, created_at: DAYS_AGO(20) },
];

// --- Project updates (8) ---

const PROJECT_UPDATES: ProjectUpdate[] = [
  { id: 'pup_000001', project_id: 'prj_000001', author_id: 'usr_001', body: 'Started indexing the most-cited Turkish guidelines. 25/50 done.', visibility: 'TEAM', created_at: DAYS_AGO(4) },
  { id: 'pup_000002', project_id: 'prj_000001', author_id: 'usr_001', body: 'Picked a vector DB. Going with pgvector to keep ops simple.', visibility: 'TEAM', created_at: DAYS_AGO(2) },
  { id: 'pup_000003', project_id: 'prj_000013', author_id: 'usr_018', body: 'Trial kicked off. Dataset loader is the first milestone.', visibility: 'TEAM', created_at: DAYS_AGO(5) },
  { id: 'pup_000004', project_id: 'prj_000006', author_id: 'usr_020', body: 'Onboarded the 6th customer. B2B sales is slow but real.', visibility: 'PUBLIC', created_at: DAYS_AGO(7) },
  { id: 'pup_000005', project_id: 'prj_000003', author_id: 'usr_003', body: 'Reached 600 active users. Hiring for mobile.', visibility: 'PUBLIC', created_at: DAYS_AGO(10) },
  { id: 'pup_000006', project_id: 'prj_000012', author_id: 'usr_015', body: 'Designer trial is going great. Three level concepts drafted.', visibility: 'TEAM', created_at: DAYS_AGO(1) },
  { id: 'pup_000007', project_id: 'prj_000008', author_id: 'usr_010', body: 'New release: shared progress photos in groups.', visibility: 'PUBLIC', created_at: DAYS_AGO(3) },
  { id: 'pup_000008', project_id: 'prj_000002', author_id: 'usr_002', body: 'First public cut of the orchestration primitives. Looking for contributors.', visibility: 'PUBLIC', created_at: DAYS_AGO(2) },
];

// --- Artifacts (6) ---

const ARTIFACTS: Artifact[] = [
  { id: 'art_000001', project_id: 'prj_000001', title: 'Trial 1 — guideline index', type: 'LINK', url: 'https://github.com/klinik-ai/guidelines', description: 'Indexed Turkish guidelines for the trial.', creator_id: 'usr_002', created_at: DAYS_AGO(5) },
  { id: 'art_000002', project_id: 'prj_000001', title: 'Trial 1 — RAG demo', type: 'LINK', url: 'https://klinik-ai-demo.vercel.app', description: 'Working RAG demo for the hypertension scenario.', creator_id: 'usr_002', created_at: DAYS_AGO(2) },
  { id: 'art_000003', project_id: 'prj_000006', title: 'Customer onboarding flow', type: 'LINK', url: 'https://github.com/dershaneos/onboarding', description: 'Code for the onboarding flow shipped in trial 4.', creator_id: 'usr_003', created_at: DAYS_AGO(13) },
  { id: 'art_000004', project_id: 'prj_000012', title: 'Core loop document', type: 'DOC', url: 'https://docs.kodakademi.example/core-loop', description: 'One-pager describing the city-building core loop.', creator_id: 'usr_024', created_at: DAYS_AGO(1) },
  { id: 'art_000005', project_id: 'prj_000013', title: 'Baseline model checkpoint', type: 'LINK', url: 'https://github.com/proteinforge/baseline', description: 'Initial baseline model for the protein task.', creator_id: 'usr_009', created_at: DAYS_AGO(2) },
  { id: 'art_000006', project_id: 'prj_000003', title: 'Meydan app', type: 'APP', url: 'https://meydan.example.com', description: 'Public Meydan web app.', creator_id: 'usr_003', created_at: DAYS_AGO(30) },
];

// --- Contributions (8) ---

const CONTRIBUTIONS: Contribution[] = [
  { id: 'con_000001', user_id: 'usr_002', project_id: 'prj_000001', type: 'CODE', description: 'Built the retrieval pipeline and RAG demo during trial 1.', evidence_url: 'https://klinik-ai-demo.vercel.app', verified_by: 'usr_001', created_at: DAYS_AGO(2) },
  { id: 'con_000002', user_id: 'usr_003', project_id: 'prj_000006', type: 'CODE', description: 'Shipped the onboarding + billing flow during trial 4.', evidence_url: 'https://github.com/dershaneos/onboarding', verified_by: 'usr_020', created_at: DAYS_AGO(13) },
  { id: 'con_000003', user_id: 'usr_009', project_id: 'prj_000013', type: 'CODE', description: 'Dataset loader for the protein design trial.', evidence_url: 'https://github.com/proteinforge/baseline', verified_by: 'usr_018', created_at: DAYS_AGO(2) },
  { id: 'con_000004', user_id: 'usr_024', project_id: 'prj_000012', type: 'DESIGN', description: 'Designed 3 levels and the core loop doc.', evidence_url: null, verified_by: 'usr_015', created_at: DAYS_AGO(1) },
  { id: 'con_000005', user_id: 'usr_005', project_id: 'prj_000003', type: 'OTHER', description: 'Provider outreach — 30 new providers onboarded.', evidence_url: null, verified_by: 'usr_003', created_at: DAYS_AGO(7) },
  { id: 'con_000006', user_id: 'usr_028', project_id: 'prj_000001', type: 'OTHER', description: 'Clinical advisor for the trial — wrote up the hypertension scenario.', evidence_url: null, verified_by: 'usr_001', created_at: DAYS_AGO(4) },
  { id: 'con_000007', user_id: 'usr_010', project_id: 'prj_000008', type: 'CODE', description: 'Released the shared progress photos feature.', evidence_url: 'https://github.com/fitcircles/app/releases', verified_by: 'usr_010', created_at: DAYS_AGO(3) },
  { id: 'con_000008', user_id: 'usr_004', project_id: 'prj_000004', type: 'DESIGN', description: 'Designed the physical housing for the prosthetic hand.', evidence_url: null, verified_by: 'usr_007', created_at: DAYS_AGO(10) },
];

// --- Channels + messages (per project + per trial) ---

const CHANNELS: Channel[] = [
  { id: 'chn_000001', type: 'PROJECT', project_id: 'prj_000001', trial_id: null, clan_id: null, name: 'KlinikAI — general', created_at: DAYS_AGO(40) },
  { id: 'chn_000002', type: 'TRIAL', project_id: null, trial_id: 'trl_000001', clan_id: null, name: 'Trial 1 — KlinikAI', created_at: DAYS_AGO(7) },
  { id: 'chn_000003', type: 'PROJECT', project_id: 'prj_000013', trial_id: null, clan_id: null, name: 'ProteinForge — general', created_at: DAYS_AGO(40) },
  { id: 'chn_000004', type: 'TRIAL', project_id: null, trial_id: 'trl_000002', clan_id: null, name: 'Trial 2 — ProteinForge', created_at: DAYS_AGO(5) },
  { id: 'chn_000005', type: 'PROJECT', project_id: 'prj_000006', trial_id: null, clan_id: null, name: 'DershaneOS — general', created_at: DAYS_AGO(40) },
];

const MESSAGES: Message[] = [
  { id: 'msg_000001', channel_id: 'chn_000002', sender_id: 'usr_001', content: 'Welcome! Let me know if you have any question on the goal.', reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(7) },
  { id: 'msg_000002', channel_id: 'chn_000002', sender_id: 'usr_002', content: 'Got it. Starting with the guideline list today.', reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(7) },
  { id: 'msg_000003', channel_id: 'chn_000002', sender_id: 'usr_002', content: '25/50 guidelines indexed. Going well.', reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(4) },
  { id: 'msg_000004', channel_id: 'chn_000002', sender_id: 'usr_001', content: 'Awesome. Want to schedule a mid-trial check-in?', reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(3) },
  { id: 'msg_000005', channel_id: 'chn_000004', sender_id: 'usr_018', content: 'Trial kickoff. Excited to see where this goes.', reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(5) },
  { id: 'msg_000006', channel_id: 'chn_000004', sender_id: 'usr_009', content: 'Loading the PDB dataset today. Will share a script by tomorrow.', reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(5) },
  { id: 'msg_000007', channel_id: 'chn_000001', sender_id: 'usr_001', body: null, reply_to: null, edited_at: null, deleted_at: null, created_at: DAYS_AGO(2) } as unknown as Message,
].filter((m) => m.content);

// fix the typo above — messages are clean
const MESSAGES_FIX: Message[] = MESSAGES.map((m) => ({ ...m, body: undefined as never }));

// --- XP + reputation events (a small back-fill to give users non-zero XP / reputation) ---

const XP_EVENTS: XpEvent[] = [
  { id: 'xpe_000001', user_id: 'usr_001', event_type: 'PROJECT_CREATED', entity_type: 'project', entity_id: 'prj_000001', idempotency_key: 'prj_000001::PROJECT_CREATED::usr_001', xp_amount: 50, created_at: DAYS_AGO(40) },
  { id: 'xpe_000002', user_id: 'usr_002', event_type: 'TRIAL_COMPLETED', entity_type: 'trial', entity_id: 'trl_000001', idempotency_key: 'trl_000001::TRIAL_COMPLETED::usr_002', xp_amount: 100, created_at: DAYS_AGO(1) },
  { id: 'xpe_000003', user_id: 'usr_003', event_type: 'TRIAL_COMPLETED', entity_type: 'trial', entity_id: 'trl_000004', idempotency_key: 'trl_000004::TRIAL_COMPLETED::usr_003', xp_amount: 100, created_at: DAYS_AGO(13) },
  { id: 'xpe_000004', user_id: 'usr_009', event_type: 'TRIAL_COMPLETED', entity_type: 'trial', entity_id: 'trl_000002', idempotency_key: 'trl_000002::TRIAL_COMPLETED::usr_009', xp_amount: 100, created_at: DAYS_AGO(2) },
  { id: 'xpe_000005', user_id: 'usr_024', event_type: 'TRIAL_COMPLETED', entity_type: 'trial', entity_id: 'trl_000003', idempotency_key: 'trl_000003::TRIAL_COMPLETED::usr_024', xp_amount: 100, created_at: DAYS_AGO(1) },
  { id: 'xpe_000006', user_id: 'usr_005', event_type: 'CONTRIBUTION_RECORDED', entity_type: 'contribution', entity_id: 'con_000005', idempotency_key: 'con_000005::CONTRIBUTION_RECORDED::usr_005', xp_amount: 30, created_at: DAYS_AGO(7) },
  { id: 'xpe_000007', user_id: 'usr_010', event_type: 'CONTRIBUTION_RECORDED', entity_type: 'contribution', entity_id: 'con_000007', idempotency_key: 'con_000007::CONTRIBUTION_RECORDED::usr_010', xp_amount: 30, created_at: DAYS_AGO(3) },
  { id: 'xpe_000008', user_id: 'usr_028', event_type: 'CONTRIBUTION_RECORDED', entity_type: 'contribution', entity_id: 'con_000006', idempotency_key: 'con_000006::CONTRIBUTION_RECORDED::usr_028', xp_amount: 30, created_at: DAYS_AGO(4) },
];

const REPUTATION_EVENTS: ReputationEvent[] = [
  { id: 'rpe_000001', user_id: 'usr_002', source: 'TRIAL_REVIEW', source_id: 'trl_000001', source_type: 'trial', delta: 5, weight: 1, reason: 'Strong trial delivery (active, mid-trial)', created_at: DAYS_AGO(1) },
  { id: 'rpe_000002', user_id: 'usr_003', source: 'TRIAL_REVIEW', source_id: 'trl_000004', source_type: 'trial', delta: 4, weight: 1, reason: 'Shipped onboarding + billing', created_at: DAYS_AGO(13) },
  { id: 'rpe_000003', user_id: 'usr_005', source: 'CONTRIBUTION_VERIFIED', source_id: 'con_000005', source_type: 'contribution', delta: 3, weight: 0.7, reason: 'Outreach contribution verified', created_at: DAYS_AGO(7) },
];

// --- Notifications (6) ---

const NOTIFICATIONS: Notification[] = [
  { id: 'ntf_000001', user_id: 'usr_001', type: 'MATCH_SUGGESTED', title: 'New match for KlinikAI', body: 'Kayra Demir looks like a strong CTO match.', link: '/matches', read_at: null, created_at: DAYS_AGO(3) },
  { id: 'ntf_000002', user_id: 'usr_001', type: 'APPLICATION_RECEIVED', title: 'New application on KlinikAI', body: 'Kaan Polat applied to the CTO role.', link: '/projects/klinik-ai', read_at: null, created_at: DAYS_AGO(2) },
  { id: 'ntf_000003', user_id: 'usr_002', type: 'TRIAL_KICKED_OFF', title: 'Trial started', body: 'You and Defne started a 14-day trial on KlinikAI.', link: '/trials/trl_000001', read_at: DAYS_AGO(7), created_at: DAYS_AGO(7) },
  { id: 'ntf_000004', user_id: 'usr_003', type: 'TRIAL_COMPLETED', title: 'Trial completed', body: 'Trial on DershaneOS is done. Leave a review.', link: '/trials/trl_000004', read_at: null, created_at: DAYS_AGO(13) },
  { id: 'ntf_000005', user_id: 'usr_001', type: 'WEEKLY_SUMMARY_READY', title: 'Weekly summary ready', body: 'Your weekly summary for KlinikAI is ready.', link: '/projects/klinik-ai', read_at: null, created_at: DAYS_AGO(1) },
  { id: 'ntf_000006', user_id: 'usr_002', type: 'MATCH_DECIDED', title: 'Match accepted', body: 'Defne accepted your match on KlinikAI.', link: '/matches', read_at: null, created_at: DAYS_AGO(7) },
];

// --- Clans (5) ---

const CLANS: Clan[] = [
  { id: 'cln_000001', slug: 'klinik-collective', name: 'Klinik Collective', description: 'A clan of people building health tech. Cross-project collaboration, shared resources, monthly show-and-tell.', type: 'TOPIC', institution: null, country_code: 'TR', visibility: 'PUBLIC', owner_id: 'usr_028', xp: 1240, lifetime_xp: 4200, created_at: DAYS_AGO(120) },
  { id: 'cln_000002', slug: 'ankara-builders', name: 'Ankara Builders', description: 'Ankara-based builders. Weekly coffee, occasional co-working.', type: 'LOCAL', institution: null, country_code: 'TR', visibility: 'PUBLIC', owner_id: 'usr_002', xp: 850, lifetime_xp: 2100, created_at: DAYS_AGO(95) },
  { id: 'cln_000003', slug: 'ai-product-clan', name: 'AI × Product', description: 'For builders combining LLM work with product thinking.', type: 'TOPIC', institution: null, country_code: 'TR', visibility: 'PUBLIC', owner_id: 'usr_022', xp: 1620, lifetime_xp: 5300, created_at: DAYS_AGO(85) },
  { id: 'cln_000004', slug: 'bilkent-alumni', name: 'Bilkent Alumni Builders', description: 'Alumni of Bilkent building things together.', type: 'INSTITUTION', institution: 'Bilkent', country_code: 'TR', visibility: 'PUBLIC', owner_id: 'usr_018', xp: 420, lifetime_xp: 1100, created_at: DAYS_AGO(60) },
  { id: 'cln_000005', slug: 'oss-tribe', name: 'OSS Tribe', description: 'Maintainers and contributors of open source projects.', type: 'TOPIC', institution: null, country_code: 'TR', visibility: 'PUBLIC', owner_id: 'usr_027', xp: 980, lifetime_xp: 3100, created_at: DAYS_AGO(75) },
];

const CLAN_MEMBERS: ClanMember[] = [
  // Klinik Collective
  { id: 'clm_000001', clan_id: 'cln_000001', user_id: 'usr_028', role: 'OWNER', joined_at: DAYS_AGO(120) },
  { id: 'clm_000002', clan_id: 'cln_000001', user_id: 'usr_001', role: 'MEMBER', joined_at: DAYS_AGO(90) },
  { id: 'clm_000003', clan_id: 'cln_000001', user_id: 'usr_009', role: 'MEMBER', joined_at: DAYS_AGO(80) },
  { id: 'clm_000004', clan_id: 'cln_000001', user_id: 'usr_018', role: 'MEMBER', joined_at: DAYS_AGO(60) },
  // Ankara Builders
  { id: 'clm_000005', clan_id: 'cln_000002', user_id: 'usr_002', role: 'OWNER', joined_at: DAYS_AGO(95) },
  { id: 'clm_000006', clan_id: 'cln_000002', user_id: 'usr_006', role: 'MEMBER', joined_at: DAYS_AGO(90) },
  { id: 'clm_000007', clan_id: 'cln_000002', user_id: 'usr_018', role: 'MEMBER', joined_at: DAYS_AGO(70) },
  { id: 'clm_000008', clan_id: 'cln_000002', user_id: 'usr_027', role: 'MEMBER', joined_at: DAYS_AGO(60) },
  { id: 'clm_000009', clan_id: 'cln_000002', user_id: 'usr_021', role: 'MEMBER', joined_at: DAYS_AGO(50) },
  // AI × Product
  { id: 'clm_000010', clan_id: 'cln_000003', user_id: 'usr_022', role: 'OWNER', joined_at: DAYS_AGO(85) },
  { id: 'clm_000011', clan_id: 'cln_000003', user_id: 'usr_002', role: 'MEMBER', joined_at: DAYS_AGO(80) },
  { id: 'clm_000012', clan_id: 'cln_000003', user_id: 'usr_001', role: 'MEMBER', joined_at: DAYS_AGO(70) },
  { id: 'clm_000013', clan_id: 'cln_000003', user_id: 'usr_025', role: 'MEMBER', joined_at: DAYS_AGO(60) },
  { id: 'clm_000014', clan_id: 'cln_000003', user_id: 'usr_014', role: 'MEMBER', joined_at: DAYS_AGO(50) },
  // Bilkent Alumni
  { id: 'clm_000015', clan_id: 'cln_000004', user_id: 'usr_018', role: 'OWNER', joined_at: DAYS_AGO(60) },
  { id: 'clm_000016', clan_id: 'cln_000004', user_id: 'usr_009', role: 'MEMBER', joined_at: DAYS_AGO(55) },
  { id: 'clm_000017', clan_id: 'cln_000004', user_id: 'usr_016', role: 'MEMBER', joined_at: DAYS_AGO(40) },
  { id: 'clm_000018', clan_id: 'cln_000004', user_id: 'usr_030', role: 'MEMBER', joined_at: DAYS_AGO(20) },
  // OSS Tribe
  { id: 'clm_000019', clan_id: 'cln_000005', user_id: 'usr_027', role: 'OWNER', joined_at: DAYS_AGO(75) },
  { id: 'clm_000020', clan_id: 'cln_000005', user_id: 'usr_002', role: 'MEMBER', joined_at: DAYS_AGO(70) },
  { id: 'clm_000021', clan_id: 'cln_000005', user_id: 'usr_006', role: 'MEMBER', joined_at: DAYS_AGO(60) },
  { id: 'clm_000022', clan_id: 'cln_000005', user_id: 'usr_021', role: 'MEMBER', joined_at: DAYS_AGO(45) },
  { id: 'clm_000023', clan_id: 'cln_000005', user_id: 'usr_019', role: 'MEMBER', joined_at: DAYS_AGO(20) },
];

let seeded = false;
let seeding: Promise<void> | null = null;

/**
 * Idempotent — loads the seed into the in-memory store on first access.
 * Subsequent calls are no-ops.
 */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  if (seeding) return seeding;
  seeding = doSeed().finally(() => {
    seeded = true;
    seeding = null;
  });
  return seeding;
}

async function doSeed(): Promise<void> {
  const db = getMemoryDb();
  const auth = getAuthStore();

  for (const p of PROFILES) {
    auth.addSeededUser({
      id: p.id, email: p.email, password: hashPw('demo1234'), created_at: p.created_at,
    });
    db.profiles.insert({
      id: p.id, username: p.username, display_name: p.display_name, email: p.email,
      avatar_url: p.avatar_url, bio: p.bio, headline: p.headline,
      user_type: p.user_type, institution: p.institution, location: p.location, country_code: p.country_code,
      timezone: p.timezone, weekly_hours: p.weekly_hours, remote_preference: p.remote_preference,
      builder_xp: p.builder_xp, builder_level: p.builder_level, reputation_score: p.reputation_score,
      onboarding_completed: p.onboarding_completed,
      created_at: p.created_at, updated_at: p.created_at,
    });
    for (const skill of p.skills) db.profile_skills.insert({ profile_id: p.id, skill });
    for (const interest of p.interests) db.profile_interests.insert({ profile_id: p.id, interest });
  }

  for (const p of PROJECTS) {
    db.projects.insert({
      id: p.id, owner_id: p.owner_id, slug: p.slug, title: p.title,
      short_description: p.short_description, description: p.description,
      category: p.category, stage: p.stage, visibility: p.visibility, remote_mode: p.remote_mode,
      location: p.location, weekly_commitment_min: p.weekly_commitment_min, weekly_commitment_max: p.weekly_commitment_max,
      github_url: p.github_url, demo_url: p.demo_url, website_url: p.website_url,
      tags: p.tags, status: p.status,
      created_at: p.created_at, updated_at: p.created_at,
    });
  }

  for (const ps of PROJECT_SKILLS) db.project_skills.insert({ project_id: ps.project_id, skill: ps.skill });
  for (const m of PROJECT_MEMBERS) db.project_members.insert(m as never);
  for (const r of PROJECT_ROLES) db.project_roles.insert(r as never);
  for (const a of APPLICATIONS) db.applications.insert(a as never);
  for (const m of MATCHES) db.matches.insert(m as never);
  for (const ms of MATCH_SCORES) db.match_scores.insert(ms as never);
  for (const t of TRIALS) db.trials.insert(t as never);
  for (const tm of TRIAL_MEMBERS) db.trial_members.insert(tm as never);
  for (const ts of TASKS) db.tasks.insert(ts as never);
  for (const m of MILESTONES) db.milestones.insert(m as never);
  for (const u of PROJECT_UPDATES) db.project_updates.insert(u as never);
  for (const a of ARTIFACTS) db.artifacts.insert(a as never);
  for (const c of CONTRIBUTIONS) db.contributions.insert(c as never);
  for (const c of CHANNELS) db.channels.insert(c as never);
  for (const m of MESSAGES) db.messages.insert(m as never);
  for (const x of XP_EVENTS) db.xp_events.insert(x as never);
  for (const r of REPUTATION_EVENTS) db.reputation_events.insert(r as never);
  for (const n of NOTIFICATIONS) db.notifications.insert(n as never);
  for (const c of CLANS) db.clans.insert(c as never);
  for (const m of CLAN_MEMBERS) db.clan_members.insert(m as never);

  // Avoid unused-var lint for the placeholder fix arrays
  void MESSAGES_FIX;
  void XP_EVENTS;
}

function hashPw(p: string): string {
  // mirrors getAuthStore().verifyPassword
  return createHash('sha256').update(`bc-demo-salt::${p}`).digest('hex');
}
