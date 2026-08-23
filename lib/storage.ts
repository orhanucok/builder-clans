/**
 * In-memory image storage.
 *
 * Master plan: production uses object storage (S3, R2, Supabase Storage).
 * For the demo, we keep the bytes in process memory as data URLs so the
 * same `image` URL can be passed everywhere without needing a CDN.
 *
 * All data is lost on server restart (in-memory only).
 */

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

/**
 * Validate a file (server-side). Returns either a base64 data URL or a
 * `{ error }` describing why the file was rejected.
 */
export async function validateImage(file: File): Promise<
  { ok: true; dataUrl: string; sizeBytes: number; type: string } | { ok: false; error: string }
> {
  if (!file || file.size === 0) return { ok: false, error: 'File is empty.' };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `File too large (max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB).` };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported type "${file.type}". Use PNG, JPG, WebP, GIF, or SVG.` };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;
  return { ok: true, dataUrl, sizeBytes: file.size, type: file.type };
}

/**
 * Image dimensions. Used for thumbnail rendering hints.
 */
export interface ImageMeta {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}
