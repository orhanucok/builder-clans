/**
 * Dev-only debug endpoint: list projects for a given owner.
 * GET /api/dev/debug/projects?ownerId=usr_001
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ensureSeeded, db } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not available when Supabase is configured.' }, { status: 404 });
  }
  await ensureSeeded();
  const ownerId = req.nextUrl.searchParams.get('ownerId');
  const all = db.projects.all();
  if (!ownerId) {
    return NextResponse.json({ count: all.length, sample: all.slice(0, 3) });
  }
  const owned = all.filter((p) => p.owner_id === ownerId);
  return NextResponse.json({ count: owned.length, ownedIds: owned.map((p) => ({ id: p.id, title: p.title, owner_id: p.owner_id })) });
}
