/**
 * Builder Clans — Matching Configuration
 *
 * Master plan §16-§18: deterministic scoring, weights in config, AI explains
 * but does NOT fabricate scores. The match score is a number; the explanation
 * is the AI's narrative.
 *
 * To tune matching behavior, edit this file. Do not sprinkle weights inline.
 */

import type { WeeklyHoursBucket, RemoteMode, UserType } from './constants';

// ---------------------------------------------------------------------------
// Weight vector (must sum to 100)
// ---------------------------------------------------------------------------

export const MATCH_WEIGHTS = {
  skill: 30,
  interest: 15,
  role: 15,
  availability: 15,
  commitment: 10,
  experience: 5,
  location: 5,
  reputation: 5,
} as const;
export const MATCH_WEIGHT_SUM = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Hard filters (a candidate that fails any of these is excluded outright)
// ---------------------------------------------------------------------------

export const MATCH_HARD_FILTERS = {
  // Reject if the project owner is also the candidate (sanity).
  rejectSelf: true,
  // Reject candidates who are already members of the project.
  rejectExistingMembers: true,
  // Reject candidates whose reputation is below this floor.
  minReputation: 20,
  // Reject candidates who explicitly blocked the user.
  respectBlocks: true,
} as const;

// ---------------------------------------------------------------------------
// Soft scoring helpers
// ---------------------------------------------------------------------------

export const AVAILABILITY_RANGE: Record<WeeklyHoursBucket, [number, number]> = {
  LESS_THAN_5: [0, 5],
  '5_TO_10': [5, 10],
  '10_TO_20': [10, 20],
  '20_PLUS': [20, 80],
};

/**
 * Compute availability compatibility (0..1) between two weekly-hours buckets.
 * Returns 1 if they overlap, falls off with distance.
 */
export function availabilityScore(
  candidate: WeeklyHoursBucket | null,
  required: [number, number] | null,
): number {
  if (!candidate || !required) return 0.5; // neutral if missing
  const [cMin, cMax] = AVAILABILITY_RANGE[candidate];
  const [rMin, rMax] = required;
  if (cMax < rMin || cMin > rMax) return 0; // no overlap
  const overlap = Math.min(cMax, rMax) - Math.max(cMin, rMin);
  const span = rMax - rMin || 1;
  return Math.min(1, overlap / span);
}

/**
 * Location/remote compatibility (0..1).
 *  - both remote → 1
 *  - project is hybrid & candidate is remote-ok → 0.85
 *  - project is on-site & candidate same city → 1, else 0
 */
export function locationScore(
  candidateRemote: RemoteMode | null,
  projectRemote: RemoteMode,
  sameCountry: boolean,
  sameCity: boolean,
): number {
  if (projectRemote === 'REMOTE') {
    return candidateRemote === 'REMOTE' || candidateRemote === 'HYBRID' ? 1 : 0.7;
  }
  if (projectRemote === 'HYBRID') {
    if (sameCity) return 1;
    if (sameCountry) return 0.7;
    if (candidateRemote === 'REMOTE') return 0.4;
    return 0.2;
  }
  // On-site
  if (sameCity) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Skill taxonomy (canonical) and synonym map (master plan §17)
// ---------------------------------------------------------------------------

export const CANONICAL_SKILLS = [
  // Languages
  'Python',
  'TypeScript',
  'JavaScript',
  'Rust',
  'Go',
  'C++',
  'C',
  'Java',
  'Kotlin',
  'Swift',
  'MATLAB',
  'R',
  // Frontend
  'React',
  'Next.js',
  'Vue',
  'Svelte',
  'Tailwind CSS',
  // Backend
  'Node.js',
  'PostgreSQL',
  'GraphQL',
  'Supabase',
  // ML / Data
  'Machine Learning',
  'Deep Learning',
  'Computer Vision',
  'NLP',
  'PyTorch',
  'TensorFlow',
  'JAX',
  'Data Engineering',
  // Domain — Healthcare
  'Medical Imaging',
  'Radiology',
  'Clinical Research',
  'Bioinformatics',
  'Genomics',
  // Domain — Robotics / Hardware
  'Robotics',
  'ROS',
  'Embedded Systems',
  'Mechanical Design',
  'PCB Design',
  'CAD',
  'Control Systems',
  // Domain — Product / Design
  'Product Design',
  'UI/UX',
  'Figma',
  'Design Systems',
  // Other
  'DevOps',
  'Security',
  '3D Printing',
  'Game Development',
  'Unity',
  'Unreal Engine',
] as const;
export type CanonicalSkill = (typeof CANONICAL_SKILLS)[number];

/**
 * Normalize an arbitrary skill string to the canonical form.
 * Case-insensitive. Synonyms are mapped.
 */
const SYNONYM_MAP: Record<string, CanonicalSkill> = {
  // ML synonyms
  ml: 'Machine Learning',
  cv: 'Computer Vision',
  'computer vision': 'Computer Vision',
  'machine learning': 'Machine Learning',
  dl: 'Deep Learning',
  nlp: 'NLP',
  'natural language processing': 'NLP',
  pytorch: 'PyTorch',
  tf: 'TensorFlow',
  tensorflow: 'TensorFlow',
  // Robotics
  ros2: 'ROS',
  ros: 'ROS',
  embedded: 'Embedded Systems',
  'mech design': 'Mechanical Design',
  'cad design': 'CAD',
  // Frontend
  reactjs: 'React',
  'react.js': 'React',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  js: 'JavaScript',
  javascript: 'JavaScript',
  // Other
  'ui/ux': 'UI/UX',
  ui: 'UI/UX',
  ux: 'UI/UX',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  'product design': 'Product Design',
  'design systems': 'Design Systems',
  figma: 'Figma',
};

export function normalizeSkill(input: string): CanonicalSkill | null {
  const key = input.trim().toLowerCase();
  if (!key) return null;
  if (SYNONYM_MAP[key]) return SYNONYM_MAP[key];
  // Direct match (case-insensitive) against canonical list
  const direct = CANONICAL_SKILLS.find((s) => s.toLowerCase() === key);
  return direct ?? null;
}

/**
 * Compute skill overlap (0..1) between candidate's skills and required skills.
 * Required skills may be empty (return 0.5 neutral).
 */
export function skillScore(
  candidateSkills: readonly string[],
  requiredSkills: readonly string[],
): number {
  if (requiredSkills.length === 0) return 0.5;
  const candSet = new Set(candidateSkills.map(normalizeSkill).filter(Boolean) as string[]);
  let matched = 0;
  for (const req of requiredSkills) {
    const norm = normalizeSkill(req);
    if (norm && candSet.has(norm)) matched += 1;
  }
  return matched / requiredSkills.length;
}

/**
 * Interest match (0..1) — simple Jaccard over interest tags.
 */
export function interestScore(
  candidateInterests: readonly string[],
  projectTags: readonly string[],
): number {
  if (projectTags.length === 0) return 0.5;
  const a = new Set(candidateInterests.map((s) => s.toLowerCase()));
  const b = new Set(projectTags.map((s) => s.toLowerCase()));
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter += 1;
  });
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

// ---------------------------------------------------------------------------
// Type / role title mapping
// ---------------------------------------------------------------------------

const ROLE_TITLE_KEYWORDS: Record<string, CanonicalSkill> = {
  'machine learning': 'Machine Learning',
  'ml engineer': 'Machine Learning',
  'ml researcher': 'Machine Learning',
  'computer vision': 'Computer Vision',
  cv: 'Computer Vision',
  radiolog: 'Radiology',
  'medical imaging': 'Medical Imaging',
  medical: 'Medical Imaging',
  'frontend': 'React',
  'front-end': 'React',
  'react developer': 'React',
  backend: 'Node.js',
  'full-stack': 'React',
  fullstack: 'React',
  designer: 'Product Design',
  'ui designer': 'Product Design',
  'ux designer': 'Product Design',
  robotics: 'Robotics',
  'robotics engineer': 'Robotics',
  embedded: 'Embedded Systems',
  mechanical: 'Mechanical Design',
};

export function roleTitleToCanonical(title: string): CanonicalSkill[] {
  const lower = title.toLowerCase();
  const out: CanonicalSkill[] = [];
  for (const [key, skill] of Object.entries(ROLE_TITLE_KEYWORDS)) {
    if (lower.includes(key)) out.push(skill);
  }
  return Array.from(new Set(out));
}

export function roleFitScore(
  roleTitle: string,
  candidateSkills: readonly string[],
): number {
  const required = roleTitleToCanonical(roleTitle);
  if (required.length === 0) return 0.5; // unknown title → neutral
  const candSet = new Set(candidateSkills.map(normalizeSkill).filter(Boolean) as string[]);
  let matched = 0;
  for (const r of required) if (candSet.has(r)) matched += 1;
  return matched / required.length;
}

// ---------------------------------------------------------------------------
// User-type experience adjustment
// ---------------------------------------------------------------------------

const EXPERIENCE_BY_USER_TYPE: Record<UserType, number> = {
  STUDENT: 0.4,
  RESEARCHER: 0.9,
  FOUNDER: 0.85,
  ENGINEER: 0.85,
  DESIGNER: 0.7,
  MEDICAL: 0.7,
  OTHER: 0.5,
};
export function experienceScore(userType: UserType | null): number {
  if (!userType) return 0.5;
  return EXPERIENCE_BY_USER_TYPE[userType];
}

// ---------------------------------------------------------------------------
// Reputation score (0..1) — used as one of the match inputs
// ---------------------------------------------------------------------------

export function reputationScoreNormalized(reputation: number): number {
  // reputation is 0..100
  return Math.max(0, Math.min(1, reputation / 100));
}

// ---------------------------------------------------------------------------
// Final score assembly
// ---------------------------------------------------------------------------

export interface MatchInput {
  candidateSkills: string[];
  candidateInterests: string[];
  candidateAvailability: WeeklyHoursBucket | null;
  candidateRemote: RemoteMode | null;
  candidateUserType: UserType | null;
  candidateReputation: number; // 0..100

  projectRequiredSkills: string[];
  projectTags: string[];
  projectCommitmentMin: number;
  projectCommitmentMax: number;
  projectRemote: RemoteMode;

  roleTitle: string;
  roleRequiredSkills: string[];

  sameCountry: boolean;
  sameCity: boolean;
}

export interface MatchBreakdown {
  skill: number;
  interest: number;
  role: number;
  availability: number;
  commitment: number;
  experience: number;
  location: number;
  reputation: number;
  final: number; // 0..100
}

export function computeMatchScore(input: MatchInput): MatchBreakdown {
  const s_skill = skillScore(input.candidateSkills, [
    ...input.projectRequiredSkills,
    ...input.roleRequiredSkills,
  ]);
  const s_interest = interestScore(input.candidateInterests, input.projectTags);
  const s_role = roleFitScore(input.roleTitle, input.candidateSkills);
  const s_avail = availabilityScore(input.candidateAvailability, [
    input.projectCommitmentMin,
    input.projectCommitmentMax,
  ]);
  const s_commit = availabilityScore(input.candidateAvailability, [
    input.projectCommitmentMin,
    input.projectCommitmentMax,
  ]);
  const s_exp = experienceScore(input.candidateUserType);
  const s_loc = locationScore(
    input.candidateRemote,
    input.projectRemote,
    input.sameCountry,
    input.sameCity,
  );
  const s_rep = reputationScoreNormalized(input.candidateReputation);

  const w = MATCH_WEIGHTS;
  const final =
    s_skill * w.skill +
    s_interest * w.interest +
    s_role * w.role +
    s_avail * w.availability +
    s_commit * w.commitment +
    s_exp * w.experience +
    s_loc * w.location +
    s_rep * w.reputation;

  return {
    skill: Math.round(s_skill * 100),
    interest: Math.round(s_interest * 100),
    role: Math.round(s_role * 100),
    availability: Math.round(s_avail * 100),
    commitment: Math.round(s_commit * 100),
    experience: Math.round(s_exp * 100),
    location: Math.round(s_loc * 100),
    reputation: Math.round(s_rep * 100),
    final: Math.round(final),
  };
}
