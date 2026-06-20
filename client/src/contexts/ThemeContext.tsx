import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { THEME_STORAGE_KEY, ThemeContext, type Theme } from '@/contexts/theme';

function applyLightMode(persist: boolean) {
  document.documentElement.classList.remove('dark');
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        applyLightMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      applyLightMode(false);
      return;
    }

    applyLightMode(Boolean(user));
  }, [user?.id, loading, user]);

  const setTheme = (_next: Theme) => {
    applyLightMode(Boolean(user));
  };

  const toggleTheme = () => {
    applyLightMode(Boolean(user));
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
