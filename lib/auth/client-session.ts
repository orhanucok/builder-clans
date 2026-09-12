/**
 * Client-side session — localStorage-backed replacement for the cookie-based
 * demo session. Required because static export can't set httpOnly cookies and
 * the user needs a consistent session across reloads and tabs.
 *
 * Same shape as `lib/auth/session.ts` but synchronous and storage-only.
 */

const SESSION_KEY = 'bc.session';
const SESSION_TTL_DAYS = 7;

export interface ClientSession {
  userId: string;
  token: string;
  expiresAt: number; // epoch ms
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function read(): ClientSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientSession;
    if (!parsed.userId || !parsed.token || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function write(s: ClientSession): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    // Mirror to sessionStorage for cross-tab reads in the same tick.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function getClientSession(): ClientSession | null {
  return read();
}

export function setClientSession(userId: string): ClientSession {
  const token = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  const s: ClientSession = {
    userId,
    token,
    expiresAt: Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  write(s);
  return s;
}

export function clearClientSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Subscribe to session changes across tabs. Returns an unsubscribe fn.
 */
export function onSessionChange(fn: (s: ClientSession | null) => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = (ev: StorageEvent) => {
    if (ev.key === SESSION_KEY) fn(read());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
