'use client';

import * as React from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'bc-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = React.useState(false);

  // Read from storage on mount
  React.useEffect(() => {
    const stored = (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme;
    setThemeState(stored);
    setMounted(true);
  }, [defaultTheme, storageKey]);

  // Apply the theme
  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = theme === 'system' ? (mql.matches ? 'dark' : 'light') : theme;
      root.classList.toggle('dark', t === 'dark');
      setResolvedTheme(t as 'dark' | 'light');
    };
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [theme, mounted]);

  const setTheme = React.useCallback(
    (t: Theme) => {
      setThemeState(t);
      try {
        localStorage.setItem(storageKey, t);
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
