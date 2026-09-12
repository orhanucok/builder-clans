import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { getPublicEnv } from '@/lib/env';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Builder Clans',
    template: '%s Â· Builder Clans',
  },
  description:
    'The network where the world builds. Find the right collaborators, test how you work together, and ship projects that prove what you can do.',
  applicationName: 'Builder Clans',
  keywords: [
    'builder network',
    'collaboration',
    'projects',
    'startups',
    'open source',
    'cofounder matching',
    'AI builders',
    'robotics',
  ],
  authors: [{ name: 'Builder Clans' }],
  openGraph: {
    type: 'website',
    title: 'Builder Clans',
    description: 'The network where the world builds.',
    siteName: 'Builder Clans',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Builder Clans',
    description: 'The network where the world builds.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Touch public env at boot so build-time validation runs.
  getPublicEnv();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider defaultTheme="dark" storageKey="bc-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
