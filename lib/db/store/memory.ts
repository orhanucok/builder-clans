/**
 * In-memory data store — the demo / dev-mode backend.
 *
 * Master plan §115: the app must boot without external services. When
 * Supabase is not configured, this module stands in for the database.
 *
 * Design:
 *   - One Table per schema table, backed by an array (small dataset, simple queries).
 *   - All writes fire synchronous listeners so other code (xp, reputation,
 *     notifications) can react after each mutation.
 *   - Deterministic UUIDs from `nextId(table)` for stable demo data.
 *
 * Persistence: in-process only. Restart re-seeds. Good enough for demo and
 * local exploration; production goes through Supabase.
 */

import type { Database as Schema } from '@/types/database';

export type TableName = keyof Schema['public']['Tables'];
export type Row<T extends TableName> = Schema['public']['Tables'][T]['Row'];
export type Insert<T extends TableName> = Schema['public']['Tables'][T]['Insert'];
export type Update<T extends TableName> = Schema['public']['Tables'][T]['Update'];

type Listener = (table: TableName, op: 'insert' | 'update' | 'delete', id?: string) => void;

const ID_COUNTERS = new Map<TableName, number>();
const ID_PREFIX: Record<TableName, string> = {
  profiles: 'prf',
  profile_skills: 'psk',
  profile_interests: 'pin',
  projects: 'prj',
  project_skills: 'psk2',
  project_members: 'pmb',
  project_roles: 'prl',
  applications: 'app',
  matches: 'mch',
  match_scores: 'msc',
  trials: 'trl',
  trial_members: 'tmb',
  trial_reviews: 'trv',
  milestones: 'mst',
  tasks: 'tsk',
  project_updates: 'pup',
  artifacts: 'art',
  contributions: 'con',
  channels: 'chn',
  messages: 'msg',
  xp_events: 'xpe',
  reputation_events: 'rpe',
  clans: 'cln',
  clan_members: 'clm',
  clan_projects: 'clp',
  challenges: 'chg',
  notifications: 'ntf',
  reports: 'rpt',
  analytics_events: 'aev',
};

export function nextId<T extends TableName>(table: T): string {
  const n = (ID_COUNTERS.get(table) ?? 0) + 1;
  ID_COUNTERS.set(table, n);
  return `${ID_PREFIX[table]}_${String(n).padStart(6, '0')}`;
}

/**
 * A single table. The runtime representation is intentionally untyped
 * (`any[]`); consumers always see `Row<T>[]` because of the explicit casts
 * below. This trade-off lets us keep the public API typed even when the
 * TypeScript inference for `Table<T>` is brittle.
 */
export class Table<T extends TableName> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rows: any[] = [];
  private listeners: Listener[] = [];

  constructor(public readonly name: T) {}

  all(): any[] {
    return this.rows.map((r) => ({ ...r }));
  }

  get(id: string): Row<T> | null {
    const found = this.rows.find((r) => r.id === id);
    return found ? ({ ...found } as Row<T>) : null;
  }

  findOne(predicate: (row: Row<T>) => boolean): Row<T> | null {
    const found = this.rows.find(predicate as (r: unknown) => boolean);
    return found ? ({ ...found } as Row<T>) : null;
  }

  list(filters?: Record<string, unknown> | ((row: Row<T>) => boolean)): Row<T>[] {
    const pred = makePredicate(filters);
    return this.rows.filter(pred as (r: unknown) => boolean).map((r) => ({ ...r })) as Row<T>[];
  }

  count(filters?: Record<string, unknown> | ((row: Row<T>) => boolean)): number {
    const pred = makePredicate(filters);
    return this.rows.filter(pred as (r: unknown) => boolean).length;
  }

  insert(data: Insert<T>): Row<T> {
    const id = (data as { id?: string }).id ?? nextId(this.name);
    const now = new Date().toISOString();
    const row = {
      ...(data as object),
      id,
      created_at: now,
      updated_at: now,
    };
    this.rows.push(row);
    this.emit('insert', id);
    return row as Row<T>;
  }

  update(id: string, patch: Update<T>): Row<T> | null {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const merged = {
      ...this.rows[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    this.rows[idx] = merged;
    this.emit('update', id);
    return merged as Row<T>;
  }

  upsert(data: Insert<T>): Row<T> {
    const id = (data as { id?: string }).id;
    if (id) {
      const existing = this.get(id);
      if (existing) return this.update(id, data as Update<T>)!;
    }
    return this.insert(data);
  }

  delete(id: string): boolean {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.rows.splice(idx, 1);
    this.emit('delete', id);
    return true;
  }

  replaceAll(rows: Row<T>[]): void {
    this.rows = rows.map((r) => ({ ...r }));
    this.emit('update', undefined);
  }

  on(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(op: 'insert' | 'update' | 'delete', id?: string) {
    for (const l of this.listeners) l(this.name, op, id);
  }
}

function makePredicate<T extends TableName>(
  filters?: Record<string, unknown> | ((row: Row<T>) => boolean),
): (row: Row<T>) => boolean {
  if (!filters) return () => true;
  if (typeof filters === 'function') return filters as (row: Row<T>) => boolean;
  return (row: Row<T>) => {
    for (const [k, v] of Object.entries(filters)) {
      const cell = (row as Record<string, unknown>)[k];
      if (v === null || v === undefined) {
        if (cell !== null && cell !== undefined) return false;
        continue;
      }
      if (Array.isArray(v)) {
        if (!v.includes(cell as never)) return false;
        continue;
      }
      if (typeof v === 'object' && v !== null) {
        for (const [op, operand] of Object.entries(v as Record<string, unknown>)) {
          if (!applyOp(op, cell, operand)) return false;
        }
        continue;
      }
      if (cell !== v) return false;
    }
    return true;
  };
}

function applyOp(op: string, cell: unknown, operand: unknown): boolean {
  switch (op) {
    case 'eq': return cell === operand;
    case 'ne': return cell !== operand;
    case 'gt': return Number(cell) > Number(operand);
    case 'gte': return Number(cell) >= Number(operand);
    case 'lt': return Number(cell) < Number(operand);
    case 'lte': return Number(cell) <= Number(operand);
    case 'in': return Array.isArray(operand) && operand.includes(cell as never);
    case 'contains':
      if (Array.isArray(cell)) return cell.includes(operand as never);
      if (typeof cell === 'string') return cell.includes(String(operand));
      return false;
    case 'ilike':
      return typeof cell === 'string' && cell.toLowerCase().includes(String(operand).toLowerCase());
    default: return true;
  }
}

class MemoryStore {
  profiles: Table<'profiles'> = new Table('profiles');
  profile_skills: Table<'profile_skills'> = new Table('profile_skills');
  profile_interests: Table<'profile_interests'> = new Table('profile_interests');
  projects: Table<'projects'> = new Table('projects');
  project_skills: Table<'project_skills'> = new Table('project_skills');
  project_members: Table<'project_members'> = new Table('project_members');
  project_roles: Table<'project_roles'> = new Table('project_roles');
  applications: Table<'applications'> = new Table('applications');
  matches: Table<'matches'> = new Table('matches');
  match_scores: Table<'match_scores'> = new Table('match_scores');
  trials: Table<'trials'> = new Table('trials');
  trial_members: Table<'trial_members'> = new Table('trial_members');
  trial_reviews: Table<'trial_reviews'> = new Table('trial_reviews');
  milestones: Table<'milestones'> = new Table('milestones');
  tasks: Table<'tasks'> = new Table('tasks');
  project_updates: Table<'project_updates'> = new Table('project_updates');
  artifacts: Table<'artifacts'> = new Table('artifacts');
  contributions: Table<'contributions'> = new Table('contributions');
  channels: Table<'channels'> = new Table('channels');
  messages: Table<'messages'> = new Table('messages');
  xp_events: Table<'xp_events'> = new Table('xp_events');
  reputation_events: Table<'reputation_events'> = new Table('reputation_events');
  clans: Table<'clans'> = new Table('clans');
  clan_members: Table<'clan_members'> = new Table('clan_members');
  clan_projects: Table<'clan_projects'> = new Table('clan_projects');
  challenges: Table<'challenges'> = new Table('challenges');
  notifications: Table<'notifications'> = new Table('notifications');
  reports: Table<'reports'> = new Table('reports');
  analytics_events: Table<'analytics_events'> = new Table('analytics_events');
  saved_projects: Table<'saved_projects'> = new Table('saved_projects');

  allTables(): Table<TableName>[] {
    return [
      this.profiles, this.profile_skills, this.profile_interests, this.projects,
      this.project_skills, this.project_members, this.project_roles, this.applications,
      this.matches, this.match_scores, this.trials, this.trial_members, this.trial_reviews,
      this.milestones, this.tasks, this.project_updates, this.artifacts, this.contributions,
      this.channels, this.messages, this.xp_events, this.reputation_events, this.clans,
      this.clan_members, this.clan_projects, this.challenges, this.notifications, this.reports,
      this.analytics_events,
    ];
  }
}

let _db: MemoryStore | null = null;

export function getMemoryDb(): MemoryStore {
  if (!_db) _db = new MemoryStore();
  return _db;
}

export function resetMemoryDb(): void {
  _db = null;
  ID_COUNTERS.clear();
}
