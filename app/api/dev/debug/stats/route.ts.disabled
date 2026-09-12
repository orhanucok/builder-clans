/**
 * Dev-only debug: show counts of all tables in the in-memory store.
 */

import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ensureSeeded, db } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isSupabaseConfigured()) return NextResponse.json({ error: 'n/a' }, { status: 404 });
  await ensureSeeded();
  const counts: Record<string, number> = {};
  for (const t of db.allTables()) counts[t.name] = t.all().length;
  return NextResponse.json(counts);
}
