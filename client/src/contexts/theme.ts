import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'nexlogs-theme';
export const THEME_LOGIN_RESET_EVENT = 'nexlogs-theme-login-reset';

export function resetThemeForLogin() {
  localStorage.setItem(THEME_STORAGE_KEY, 'light');
  document.documentElement.classList.remove('dark');
  window.dispatchEvent(new Event(THEME_LOGIN_RESET_EVENT));
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
