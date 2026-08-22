/**
 * Store facade — the single import point for data access.
 *
 * Master plan §115: the app must boot without Supabase. This module decides
 * at runtime whether to use Supabase or the in-memory store, and exposes a
 * common shape so call-sites don't care which one is active.
 *
 * Usage:
 *   import { db, ensureSeeded } from '@/lib/db/store'
 *   const project = db.projects.get('prj_xxx')
 *
 * The `db` object is a `Database` instance from `./memory` for in-memory,
 * or a thin Supabase adapter (TODO when DB is wired) that mirrors the same
 * shape.
 */

import { isSupabaseConfigured } from '@/lib/env';
import { getMemoryDb, type Database as MemoryDatabase } from './memory';
import { ensureSeeded as _ensureSeeded } from './seed';
import { getAuthStore as _getAuthStore } from './schema';

export type { MemoryDatabase as Database };
export { _ensureSeeded as ensureSeeded };
export { _getAuthStore as getAuthStore };

/** Returns the active data store. Always returns the in-memory store for now. */
export function getDb(): MemoryDatabase {
  // Supabase support is intentionally deferred to keep the demo experience
  // consistent. When DB env vars are present we still use the in-memory store
  // because the Supabase adapter is not implemented yet. Wiring it would
  // require translating `.from(...).select(...).eq(...)` chains to a unified
  // query interface — that is a separate piece of work.
  if (isSupabaseConfigured()) {
    // Future: return a Supabase adapter here.
  }
  return getMemoryDb();
}

// The `db` singleton is intentionally typed as `any` at the call-site so
// that TS doesn't tie us to a particular table's Row type when chaining
// `.all()/.list()/.findOne()`. The runtime rows are still fully typed via
// the Table<T>.all() return value. This is the same trade-off the Supabase
// JS client makes when it returns `Promise<{ data: any[] | null }>` from
// `.select()`. Page-level code can still re-cast where it cares.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _db: any = getDb();

/** Convenience singleton. */
export const db = _db;
