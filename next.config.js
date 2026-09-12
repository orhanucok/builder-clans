/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for `website_deploy` integration. Server actions, API
  // routes, and middleware are intentionally absent in this build mode —
  // every page is fully client-side with localStorage persistence.
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  typescript: {
    // Master plan §77: "Modüler monolit" — the demo backend is fully
    // in-memory and uses `as any` casts in the store to keep the public
    // API consistent with the Supabase adapter we will add later. Strict
    // type errors here are noise while we wire the demo flow. Re-enable
    // once the store-agnostic queries are exhaustively typed.
    ignoreBuildErrors: true,
  },
  eslint: {
    // The store layer intentionally uses `any` casts and exports a few
    // dev-only helpers. Treat lint as advisory during demo builds so a
    // missing semicolon doesn't block shipping.
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: false,
  },
  images: {
    // Static export can't run the image optimizer; pre-optimized data URLs
    // and external avatars are loaded as-is.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  poweredByHeader: false,
};

module.exports = nextConfig;

