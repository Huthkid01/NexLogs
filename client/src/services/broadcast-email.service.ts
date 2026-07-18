import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getMarketingUnsubscribedUserIds } from '@/services/marketing-unsubscribe.service';

export interface BroadcastEmailPayload {
  product_ids: string[];
  subject: string;
  custom_message?: string;
  recipient_user_ids?: string[];
  recipient_emails?: string[];
  send_to_all?: boolean;
  skip_history?: boolean;
  tracking_token?: string;
  smtp_account_id?: string | null;
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
  recipient_emails?: string[];
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

  async createBroadcastDraft(input: {
    subject: string;
    product_ids: string[];
    custom_message?: string | null;
    recipient_count: number;
    recipient_user_ids?: string[];
    recipient_emails?: string[];
  }): Promise<string> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) {
      throw new Error('Your session expired. Log in again and retry.');
    }

    const { data, error } = await supabase
      .from('email_broadcasts')
      .insert({
        sent_by: sessionData.session.user.id,
        subject: input.subject,
        product_ids: input.product_ids,
        custom_message: input.custom_message ?? null,
        recipient_count: input.recipient_count,
        sent_count: 0,
        failed_count: 0,
        recipient_user_ids: input.recipient_user_ids ?? [],
        recipient_emails: input.recipient_emails ?? [],
      } as never)
      .select('id')
      .single();

    if (error) throw error;
    return (data as { id: string }).id;
  },

  async finalizeBroadcast(broadcastId: string, input: { sent_count: number; failed_count: number }): Promise<void> {
    const { error } = await supabase
      .from('email_broadcasts')
      .update({
        sent_count: input.sent_count,
        failed_count: input.failed_count,
      } as never)
      .eq('id', broadcastId);

    if (error) throw error;
  },

  async recordBroadcast(input: {
    subject: string;
    product_ids: string[];
    custom_message?: string | null;
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    recipient_user_ids?: string[];
    recipient_emails?: string[];
  }): Promise<void> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) {
      throw new Error('Your session expired. Log in again and retry.');
    }

    const { error } = await supabase.from('email_broadcasts').insert({
      sent_by: sessionData.session.user.id,
      subject: input.subject,
      product_ids: input.product_ids,
      custom_message: input.custom_message ?? null,
      recipient_count: input.recipient_count,
      sent_count: input.sent_count,
      failed_count: input.failed_count,
      recipient_user_ids: input.recipient_user_ids ?? [],
      recipient_emails: input.recipient_emails ?? [],
    } as never);

    if (error) throw error;
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
