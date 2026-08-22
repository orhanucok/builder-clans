import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { aiProjectPlanFromDescription } from '@/lib/ai/features';
import { isFeatureEnabled } from '@/config/feature-flags';
import { requireUser } from '@/lib/auth/session';

const schema = z.object({
  title: z.string().min(0).max(120),
  description: z.string().min(0).max(8000),
});

export async function POST(req: Request) {
  // Auth gate (no anonymous AI calls)
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('AI_FEATURES')) {
    return NextResponse.json({ error: 'ai_disabled' }, { status: 404 });
  }

  // Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rl = rateLimit(`ai:plan:${ip}`, 20);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const plan = await aiProjectPlanFromDescription(body);
  return NextResponse.json({ plan });
}
