/**
 * Client-side persistence layer.
 *
 * Wraps the in-memory store with localStorage + BroadcastChannel sync so that
 * the static-exported build behaves like a real backend to the user (data
 * persists across page reloads and syncs across tabs).
 *
 * Design (matches the FORGE pattern):
 *  - Each table is persisted as a JSON array under the key `bc.db.<table>`.
 *  - BroadcastChannel `bc.db` notifies other tabs of writes so they can refresh.
 *  - `hydrate()` reads all tables once at module init and seeds them on first
 *    run using the existing seed module.
 *  - Server-side code falls through to in-memory only (no localStorage).
 *
 * The store API (`db.projects.all()` etc.) is unchanged — consumers don't care
 * whether persistence is in-memory or localStorage-backed.
 */

import { getMemoryDb, resetMemoryDb, type TableName } from './memory';

const STORAGE_PREFIX = 'bc.db.';
const CHANNEL_NAME = 'bc.db';
const STORAGE_VERSION_KEY = 'bc.db.version';
const STORAGE_VERSION = '1';

type ChangeEvent = {
  table: TableName;
  op: 'insert' | 'update' | 'delete' | 'replace';
  id?: string;
  source: 'local' | 'remote';
};

let hydrated = false;
let channel: BroadcastChannel | null = null;
const listeners = new Set<(e: ChangeEvent) => void>();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function tableKey(name: TableName): string {
  return `${STORAGE_PREFIX}${name}`;
}

function safeRead(name: TableName): unknown[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(tableKey(name));
    if (!raw) return null;
    return JSON.parse(raw) as unknown[];
  } catch {
    return null;
  }
}

function safeWrite(name: TableName, rows: unknown[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(tableKey(name), JSON.stringify(rows));
  } catch (err) {
    // Quota exceeded is the realistic case; surface to console for debugging.
    // eslint-disable-next-line no-console
    console.warn(`[bc.db] failed to persist ${name}`, err);
  }
}

/**
 * Load all tables from localStorage into the in-memory store. Tables that
 * don't exist on disk fall back to whatever the seeder put in memory.
 *
 * Idempotent: calling it twice is a no-op.
 */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (!isBrowser()) {
    hydrated = true;
    return;
  }
  // Migration safety: if the persisted schema version is older, wipe and reseed.
  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  if (version !== STORAGE_VERSION) {
    clearAllStorage();
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
  }
  const db = getMemoryDb();
  for (const t of db.allTables()) {
    const persisted = safeRead(t.name);
    if (persisted && Array.isArray(persisted)) {
      t.replaceAll(persisted as never);
    }
  }
  // Start listening for store mutations so we can persist + broadcast them.
  for (const t of db.allTables()) {
    t.on((table, op, id) => {
      // Re-read current rows from memory and persist (cheap for small demo data).
      const rows = (t as unknown as { all(): unknown[] }).all();
      safeWrite(table, rows);
      broadcastChange({ table, op, id, source: 'local' });
    });
  }
  // Listen for changes from other tabs and apply them.
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (ev) => {
      const e = ev.data as ChangeEvent;
      if (!e || e.source === 'local' || !e.table) return;
      const target = getMemoryDb();
      const tbl = (target as unknown as Record<string, { all(): unknown[] }>)[e.table];
      if (!tbl) return;
      const persisted = safeRead(e.table);
      if (persisted) {
        (target as unknown as Record<string, { replaceAll(rows: unknown[]): void }>)[e.table].replaceAll(persisted);
      }
      for (const fn of listeners) fn({ ...e, source: 'remote' });
    });
  } catch {
    // BroadcastChannel unavailable (Safari private mode etc.); persistence still works.
    channel = null;
  }
  hydrated = true;
}

function broadcastChange(e: ChangeEvent): void {
  if (!channel) return;
  try {
    channel.postMessage(e);
  } catch {
    /* ignore */
  }
}

function clearAllStorage(): void {
  if (!isBrowser()) return;
  for (const t of getMemoryDb().allTables()) {
    try {
      localStorage.removeItem(tableKey(t.name));
    } catch {
      /* ignore */
    }
  }
}

/**
 * Subscribe to store changes (any source). Returns an unsubscribe function.
 */
export function onChange(fn: (e: ChangeEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Wipe all persisted data and reseed from scratch. Useful for "Reset demo"
 * actions or when switching personas in a destructive way.
 */
export async function resetAndReseed(): Promise<void> {
  if (isBrowser()) clearAllStorage();
  resetMemoryDb();
  hydrated = false;
  await hydrate();
  const { ensureSeeded } = await import('./seed');
  await ensureSeeded();
}
