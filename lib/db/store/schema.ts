/**
 * In-memory auth store — a tiny parallel of `auth.users` for demo mode.
 *
 * Real Supabase handles auth.users in a separate schema. In demo mode we
 * keep a single in-memory map from user id -> { email, password_hash,
 * created_at }. The "password_hash" is just the password string (clearly
 * demo-only) so sign-in works without a real bcrypt.
 */

import { randomUUID, createHash } from 'node:crypto';

export interface DemoUser {
  id: string;
  email: string;
  password: string; // demo only; in real Supabase this lives in auth.users
  created_at: string;
}

class AuthStore {
  private byEmail = new Map<string, DemoUser>();
  private byId = new Map<string, DemoUser>();
  private sessions = new Map<string, string>(); // sessionToken -> userId

  createUser(email: string, password: string): DemoUser {
    const normalized = email.trim().toLowerCase();
    if (this.byEmail.has(normalized)) {
      throw new Error('A user with this email already exists.');
    }
    const user: DemoUser = {
      id: randomUUID(),
      email: normalized,
      password: hashPassword(password),
      created_at: new Date().toISOString(),
    };
    this.byEmail.set(normalized, user);
    this.byId.set(user.id, user);
    return user;
  }

  getByEmail(email: string): DemoUser | null {
    return this.byEmail.get(email.trim().toLowerCase()) ?? null;
  }

  getById(id: string): DemoUser | null {
    return this.byId.get(id) ?? null;
  }

  verifyPassword(user: DemoUser, password: string): boolean {
    return user.password === hashPassword(password);
  }

  createSession(userId: string): string {
    const token = randomUUID();
    this.sessions.set(token, userId);
    return token;
  }

  getUserBySession(token: string): DemoUser | null {
    const id = this.sessions.get(token);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  destroySession(token: string): void {
    this.sessions.delete(token);
  }

  /** Bulk seed existing demo users (no-op for the password check on login). */
  addSeededUser(user: DemoUser): void {
    this.byEmail.set(user.email, user);
    this.byId.set(user.id, user);
  }
}

function hashPassword(p: string): string {
  // demo only — never use this in production.
  return createHash('sha256').update(`bc-demo-salt::${p}`).digest('hex');
}

let _auth: AuthStore | null = null;
export function getAuthStore(): AuthStore {
  if (!_auth) _auth = new AuthStore();
  return _auth;
}

export function resetAuthStore(): void {
  _auth = null;
}
