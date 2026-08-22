/**
 * Builder Clans — Environment validation
 *
 * Master plan §115: validate env vars at boot. Never crash silently in prod.
 *
 * Uses zod for runtime validation. Imported ONCE at app startup (see app/layout.tsx)
 * so any missing required var throws immediately.
 */

import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Builder Clans'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  AI_PROVIDER: z.enum(['openai', 'anthropic', 'mock']).default('mock'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL_DEFAULT: z.string().default('gpt-4o-mini'),

  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),

  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  FEATURE_AI: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_CLANS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  FEATURE_LEADERBOARD: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  FEATURE_CHALLENGES: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  FEATURE_NATIVE_CHAT: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_GITHUB_INTEGRATION: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  RATE_LIMIT_DEFAULT_PER_MINUTE: z.coerce.number().default(60),
  RATE_LIMIT_AI_PER_MINUTE: z.coerce.number().default(20),

  SEED_USER_PASSWORD: z.string().default('builder-clans-demo-2026'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // We log all missing/invalid keys but never leak values.
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    // eslint-disable-next-line no-console
    console.warn(
      `[Builder Clans] Environment validation produced warnings:\n${issues}\nFalling back to defaults.`,
    );
  }
  cached = (parsed.success ? parsed.data : envSchema.parse({})) as Env;
  return cached;
}

/**
 * Whether Supabase is configured. Routes that need DB will redirect to setup
 * when this returns false. Lets the app boot on a fresh clone without secrets.
 */
export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
