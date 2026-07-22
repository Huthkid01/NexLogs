import { supabase } from '@/lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface MarketingUnsubscribeResult {
  ok: boolean;
  email?: string;
  message?: string;
}

export async function processMarketingUnsubscribe(token: string): Promise<MarketingUnsubscribeResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('App configuration is missing. Please contact support@nexlogs.site.');
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/functions/v1/process-marketing-unsubscribe?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
    },
  );

  const payload = (await response.json()) as MarketingUnsubscribeResult & { error?: string };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'Could not process your unsubscribe request.');
  }

  return payload;
}

export async function getMarketingUnsubscribedUserIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('marketing_email_unsubscribes').select('user_id');

  if (error) {
    if (error.message.includes('marketing_email_unsubscribes')) {
      return new Set();
    }
    throw error;
  }

  return new Set((data ?? []).map((row) => row.user_id as string));
}
