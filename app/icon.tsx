/**
 * Builder Clans favicon — a hammer glyph on a dark background.
 * Next.js automatically generates the proper sizes for the link tag.
 */
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fafafa',
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        ⛏
      </div>
    ),
    { ...size },
  );
}
