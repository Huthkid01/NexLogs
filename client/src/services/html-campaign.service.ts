import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface HtmlCampaignPayload {
  subject: string;
  html_body: string;
  template_name?: string;
  recipient_user_ids?: string[];
  recipient_emails?: string[];
  send_to_all?: boolean;
}

export interface HtmlCampaignResult {
  ok: boolean;
  recipient_count: number;
  sent_count?: number;
  failed_count?: number;
  failures?: string[];
  from?: string;
}

export interface EmailCampaignRecord {
  id: string;
  sent_by: string | null;
  subject: string;
  html_body: string;
  template_name: string | null;
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
    } catch {
      // Fall through.
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to send HTML campaign';
}

export const htmlCampaignService = {
  async send(payload: HtmlCampaignPayload): Promise<HtmlCampaignResult> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Your session expired. Log in again and retry.');
    }

    const { data, error } = await supabase.functions.invoke('send-admin-html-campaign', {
      body: payload,
    });

    if (error || !data?.ok) {
      throw new Error(await readFunctionErrorMessage(error, data));
    }

    return data as HtmlCampaignResult;
  },

  async getRecentCampaigns(limit = 8): Promise<EmailCampaignRecord[]> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message.includes('email_campaigns')) {
        return [];
      }
      throw error;
    }

    return (data ?? []) as EmailCampaignRecord[];
  },
};
