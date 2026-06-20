import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { THEME_STORAGE_KEY, ThemeContext, type Theme } from '@/contexts/theme';

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return null;
}

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? 'light');
  const effectiveTheme = user ? theme : 'light';

  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setThemeState('light');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      applyTheme('light', false);
      return;
    }

    applyTheme(effectiveTheme, Boolean(user));
  }, [effectiveTheme, loading, user]);

  const setTheme = (next: Theme) => {
    if (!user) return;
    setThemeState(next);
  };

  const toggleTheme = () => {
    if (!user) return;
    setThemeState((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
