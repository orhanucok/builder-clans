/**
 * Generic image upload endpoint.
 *
 * POST /api/upload  (multipart/form-data, field name: "file")
 *   → { ok: true, url: "data:image/png;base64,...", type, sizeBytes }
 *   → { ok: false, error }
 *
 * Demo only — bytes live in process memory. In production this writes
 * to S3/R2/Supabase Storage and returns the CDN URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { validateImage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB hard cap (multipart limit)

export async function POST(req: NextRequest) {
  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Image upload not implemented for Supabase storage yet.' },
      { status: 501 },
    );
  }
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Could not parse form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Missing "file" field.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: 'Upload too large.' }, { status: 413 });
  }

  const result = await validateImage(file);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    url: result.dataUrl,
    type: result.type,
    sizeBytes: result.sizeBytes,
  });
}
