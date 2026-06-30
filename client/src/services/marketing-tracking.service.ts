import { supabase } from '@/lib/supabase';

export type MarketingSourceType = 'broadcast' | 'campaign';

export interface EmailMarketingSend {
  id: string;
  tracking_token: string;
  source_type: MarketingSourceType;
  source_id: string;
  recipient_email: string;
  recipient_user_id: string | null;
  send_status: 'pending' | 'sent' | 'failed';
  send_error: string | null;
  sent_at: string | null;
  first_opened_at: string | null;
  open_count: number;
  first_clicked_at: string | null;
  click_count: number;
  created_at: string;
}

export interface EmailMarketingClick {
  id: string;
  send_id: string;
  link_url: string;
  clicked_at: string;
  user_agent: string | null;
}

export interface MarketingBatchOverview {
  source_type: MarketingSourceType;
  source_id: string;
  subject: string;
  sent_at: string;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
}

export const marketingTrackingService = {
  async createSend(input: {
    source_type: MarketingSourceType;
    source_id: string;
    recipient_email: string;
    recipient_user_id?: string;
  }): Promise<EmailMarketingSend> {
    const { data, error } = await supabase
      .from('email_marketing_sends')
      .insert({
        source_type: input.source_type,
        source_id: input.source_id,
        recipient_email: input.recipient_email.trim().toLowerCase(),
        recipient_user_id: input.recipient_user_id ?? null,
        send_status: 'pending',
      } as never)
      .select('*')
      .single();

    if (error) throw error;
    return data as EmailMarketingSend;
  },

  async getBatchOverview(limit = 12): Promise<MarketingBatchOverview[]> {
    const [{ data: broadcasts }, { data: campaigns }, { data: sends }] = await Promise.all([
      supabase
        .from('email_broadcasts')
        .select('id, subject, created_at, recipient_count, sent_count, failed_count')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('email_campaigns')
        .select('id, subject, created_at, recipient_count, sent_count, failed_count')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('email_marketing_sends')
        .select('source_type, source_id, send_status, open_count, click_count'),
    ]);

    if (sends === null) return [];

    const statsBySource = new Map<string, {
      delivered: number;
      failed: number;
      opened: number;
      clicked: number;
    }>();

    for (const row of sends as Array<{
      source_type: MarketingSourceType;
      source_id: string;
      send_status: string;
      open_count: number;
      click_count: number;
    }>) {
      const key = `${row.source_type}:${row.source_id}`;
      const current = statsBySource.get(key) ?? { delivered: 0, failed: 0, opened: 0, clicked: 0 };
      if (row.send_status === 'sent') current.delivered += 1;
      if (row.send_status === 'failed') current.failed += 1;
      if ((row.open_count ?? 0) > 0) current.opened += 1;
      if ((row.click_count ?? 0) > 0) current.clicked += 1;
      statsBySource.set(key, current);
    }

    const broadcastRows = (broadcasts ?? []).map((row) => {
      const stats = statsBySource.get(`broadcast:${row.id}`) ?? {
        delivered: row.sent_count ?? 0,
        failed: row.failed_count ?? 0,
        opened: 0,
        clicked: 0,
      };

      return {
        source_type: 'broadcast' as const,
        source_id: row.id,
        subject: row.subject,
        sent_at: row.created_at,
        recipient_count: row.recipient_count ?? 0,
        delivered_count: stats.delivered,
        failed_count: stats.failed,
        opened_count: stats.opened,
        clicked_count: stats.clicked,
      };
    });

    const campaignRows = (campaigns ?? []).map((row) => {
      const stats = statsBySource.get(`campaign:${row.id}`) ?? {
        delivered: row.sent_count ?? 0,
        failed: row.failed_count ?? 0,
        opened: 0,
        clicked: 0,
      };

      return {
        source_type: 'campaign' as const,
        source_id: row.id,
        subject: row.subject,
        sent_at: row.created_at,
        recipient_count: row.recipient_count ?? 0,
        delivered_count: stats.delivered,
        failed_count: stats.failed,
        opened_count: stats.opened,
        clicked_count: stats.clicked,
      };
    });

    return [...broadcastRows, ...campaignRows]
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
      .slice(0, limit);
  },

  async getSendsForBatch(sourceType: MarketingSourceType, sourceId: string): Promise<EmailMarketingSend[]> {
    const { data, error } = await supabase
      .from('email_marketing_sends')
      .select('*')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.message.includes('email_marketing_sends')) return [];
      throw error;
    }

    return (data ?? []) as EmailMarketingSend[];
  },

  async getClicksForSend(sendId: string): Promise<EmailMarketingClick[]> {
    const { data, error } = await supabase
      .from('email_marketing_clicks')
      .select('*')
      .eq('send_id', sendId)
      .order('clicked_at', { ascending: false });

    if (error) {
      if (error.message.includes('email_marketing_clicks')) return [];
      throw error;
    }

    return (data ?? []) as EmailMarketingClick[];
  },
};
