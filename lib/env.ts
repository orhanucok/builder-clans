/**
 * Builder Clans — Environment access.
 *
 * Two surfaces:
 *   - `getPublicEnv()` — client-safe, reads only NEXT_PUBLIC_* vars. The
 *     static export inlines these at build time so no server runtime is
 *     needed.
 *   - `getEnv()` — server-only. Reads the full schema (including private
 *     keys like SUPABASE_SERVICE_ROLE_KEY and AI_API_KEY). On the server
 *     during static export the values are all `undefined`; the schema is
 *     lenient (every non-public var is optional) so this returns the
 *     defaults without throwing. Client bundles that accidentally import
 *     this function will see `process is not defined` at runtime, but that
 *     path is unused in static mode — all client code goes through
 *     `getPublicEnv()`.
 */

import { z } from 'zod';

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Builder Clans'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  FEATURE_AI: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_CLANS: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_LEADERBOARD: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_CHALLENGES: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_NATIVE_CHAT: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
});

const fullSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'mock']).default('mock'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL_DEFAULT: z.string().default('gpt-4o-mini'),
  RATE_LIMIT_DEFAULT_PER_MINUTE: z.coerce.number().default(60),
  RATE_LIMIT_AI_PER_MINUTE: z.coerce.number().default(20),
  SEED_USER_PASSWORD: z.string().default('builder-clans-demo-2026'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type FullEnv = z.infer<typeof fullSchema>;

let publicCached: PublicEnv | null = null;
let fullCached: FullEnv | null = null;

function safeParse<T extends z.ZodTypeAny>(schema: T, raw: Record<string, unknown>): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(raw) as z.SafeParseReturnType<unknown, z.infer<T>>;
}

/**
 * Public env — safe to call from client components. Reads only NEXT_PUBLIC_*
 * keys so the static export's inlined values are enough.
 */
export function getPublicEnv(): PublicEnv {
  if (publicCached) return publicCached;
  const raw: Record<string, unknown> = {};
  if (typeof process !== 'undefined' && process.env) {
    for (const [k, v] of Object.entries(process.env)) {
      if (k.startsWith('NEXT_PUBLIC_') || k.startsWith('FEATURE_')) raw[k] = v;
    }
  }
  const parsed = safeParse(publicSchema, raw);
  publicCached = parsed.success ? parsed.data : (publicSchema.parse({}) as PublicEnv);
  return publicCached;
}

/**
 * Full env — server-side. Used by Supabase server client, AI provider,
 * analytics, etc. Always returns defaults if `process.env` is unavailable.
 */
export function getEnv(): FullEnv {
  if (fullCached) return fullCached;
  const raw = (typeof process !== 'undefined' && process.env ? process.env : {}) as Record<string, unknown>;
  const parsed = safeParse(fullSchema, raw);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.warn('[Builder Clans] env validation warnings:\n' + parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
  }
  fullCached = parsed.success ? parsed.data : (fullSchema.parse({}) as FullEnv);
  return fullCached;
}

export function isSupabaseConfigured(): boolean {
  const env = getPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
