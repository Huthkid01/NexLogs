import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let client: SupabaseClient | null = null;

export function getServiceSupabase() {
  if (!client) {
    client = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey());
  }
  return client;
}
