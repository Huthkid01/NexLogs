import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getMarketingUnsubscribedUserIds } from '@/services/marketing-unsubscribe.service';

export interface BroadcastEmailPayload {
  product_ids: string[];
  subject: string;
  custom_message?: string;
  recipient_user_ids?: string[];
  send_to_all?: boolean;
}

export interface BroadcastEmailResult {
  ok: boolean;
  dry_run?: boolean;
  total_eligible?: number;
  recipient_count: number;
  sent_count?: number;
  failed_count?: number;
  product_count?: number;
  failures?: string[];
  from?: string;
  subject?: string;
}

export interface EmailBroadcastRecord {
  id: string;
  sent_by: string | null;
  subject: string;
  product_ids: string[];
  custom_message: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  recipient_user_ids?: string[];
  created_at: string;
}

async function readFunctionErrorMessage(error: unknown, data: unknown) {
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return String((data as { error: string }).error);
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
        return String(payload.error);
      }
      if (payload && typeof payload === 'object' && 'message' in payload && payload.message) {
        return String(payload.message);
      }
    } catch {
      // Fall through to generic message.
    }
  }

  if (error instanceof Error && error.message.includes('Failed to send a request to the Edge Function')) {
    return 'Could not reach the email function. Deploy send-admin-broadcast-email on Supabase and try again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to send broadcast email';
}

export const broadcastEmailService = {
  async send(payload: BroadcastEmailPayload): Promise<BroadcastEmailResult> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Your session expired. Log in again and retry.');
    }

    const { data, error } = await supabase.functions.invoke('send-admin-broadcast-email', {
      body: payload,
    });

    if (error || !data?.ok) {
      throw new Error(await readFunctionErrorMessage(error, data));
    }

    return data as BroadcastEmailResult;
  },

  async getRecentBroadcasts(limit = 10): Promise<EmailBroadcastRecord[]> {
    const { data, error } = await supabase
      .from('email_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message.includes('email_broadcasts')) {
        return [];
      }
      throw error;
    }

    return (data ?? []) as EmailBroadcastRecord[];
  },

  async getEligibleRecipients() {
    const [{ data, error }, unsubscribedIds] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, is_suspended')
        .eq('is_suspended', false)
        .neq('role', 'admin')
        .order('full_name', { ascending: true }),
      getMarketingUnsubscribedUserIds(),
    ]);

    if (error) throw error;

    return (data ?? [])
      .filter((profile) => profile.email?.trim())
      .filter((profile) => !unsubscribedIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        email: profile.email.trim(),
        fullName: profile.full_name?.trim() || profile.email.split('@')[0],
      }));
  },

  async getEligibleRecipientCount(): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false)
      .neq('role', 'admin');

    if (error) throw error;
    return count ?? 0;
  },
};
