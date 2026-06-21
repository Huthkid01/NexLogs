const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function hasSupabaseConfig(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key',
  );
}

/** Helps diagnose missing Vercel/production env vars after build. */
export function getSupabaseConfigError(): string | null {
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
