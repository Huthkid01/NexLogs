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

/** Helps diagnose missing Vercel/production env vars after build. */
export function getSupabaseConfigError() {
  if (useMockFlag) {
    return 'VITE_USE_MOCK_DATA is true. Set it to false in Vercel and redeploy.';
  }

  if (!supabaseUrl?.trim()) {
    return 'VITE_SUPABASE_URL is missing. Add it in Vercel → Settings → Environment Variables, then redeploy.';
  }

  if (!supabaseAnonKey?.trim()) {
    return 'VITE_SUPABASE_ANON_KEY is missing. Add it in Vercel → Settings → Environment Variables, then redeploy.';
  }

  if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
    return 'Supabase env vars are still placeholders. Replace them in Vercel and redeploy.';
  }

  return null;
}
