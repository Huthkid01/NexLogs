import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  THEME_LOGIN_RESET_EVENT,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
} from '@/contexts/theme';
import { safeStorageGet, safeStorageSet } from '@/lib/safe-storage';

function getStoredTheme(): Theme | null {
  const stored = safeStorageGet(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return null;
}

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  if (persist) {
    safeStorageSet(THEME_STORAGE_KEY, theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? 'light');

  useLayoutEffect(() => {
    if (loading) return;

    if (!user) {
      applyTheme('light', false);
      return;
    }

    applyTheme(theme, true);
  }, [theme, user, loading]);

  useEffect(() => {
    const handleLoginReset = () => {
      setThemeState('light');
    };

    window.addEventListener(THEME_LOGIN_RESET_EVENT, handleLoginReset);
    return () => {
      window.removeEventListener(THEME_LOGIN_RESET_EVENT, handleLoginReset);
    };
  }, []);

  useEffect(() => {
    const syncStoredTheme = () => {
      if (document.visibilityState !== 'visible' || !user) return;

      const stored = getStoredTheme();
      if (!stored || stored === theme) return;
      setThemeState(stored);
    };

    document.addEventListener('visibilitychange', syncStoredTheme);
    return () => {
      document.removeEventListener('visibilitychange', syncStoredTheme);
    };
  }, [user, theme]);

  const setTheme = (next: Theme) => {
    if (!user) return;
    setThemeState(next);
  };

  const toggleTheme = () => {
    if (!user) return;
    setThemeState((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const effectiveTheme = user ? theme : 'light';

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
