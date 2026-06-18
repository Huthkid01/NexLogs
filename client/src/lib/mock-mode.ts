const useMockFlag = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key'
);

/** Frontend-only mock data when Supabase is not configured or mock flag is on. */
export const isMockMode = () => useMockFlag || !hasSupabaseConfig;

export const DEMO_LOGIN = {
  email: 'demo@nexlogs.com',
  password: 'Demo1234!',
} as const;

export const DEMO_ADMIN_LOGIN = {
  email: 'admin@nexlogs.com',
  password: 'Admin1234!',
} as const;
