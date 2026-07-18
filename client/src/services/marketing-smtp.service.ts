import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export const DEFAULT_MARKETING_SMTP_ID = 'default';

export interface MarketingSmtpAccount {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_name: string;
  from_address: string;
  is_active: boolean;
  is_default?: boolean;
  has_password?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingSmtpInput {
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  from_name: string;
  from_address: string;
  is_active?: boolean;
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

  if (error instanceof Error && error.message) return error.message;
  return 'SMTP request failed';
}

async function invokeManage(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error('Your session expired. Log in again and retry.');
  }

  const { data, error } = await supabase.functions.invoke('manage-marketing-smtp', { body });
  if (error || !data?.ok) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }
  return data as Record<string, unknown>;
}

export const marketingSmtpService = {
  async list(): Promise<{ defaultAccount: MarketingSmtpAccount; accounts: MarketingSmtpAccount[] }> {
    const data = await invokeManage({ action: 'list' });
    return {
      defaultAccount: data.default_account as MarketingSmtpAccount,
      accounts: (data.accounts as MarketingSmtpAccount[]) ?? [],
    };
  },

  async create(input: MarketingSmtpInput): Promise<MarketingSmtpAccount> {
    const data = await invokeManage({ action: 'create', ...input });
    return data.account as MarketingSmtpAccount;
  },

  async update(id: string, input: MarketingSmtpInput): Promise<MarketingSmtpAccount> {
    const data = await invokeManage({ action: 'update', id, ...input });
    return data.account as MarketingSmtpAccount;
  },

  async remove(id: string): Promise<void> {
    await invokeManage({ action: 'delete', id });
  },

  async test(input: Partial<MarketingSmtpInput> & { id?: string }): Promise<string> {
    const data = await invokeManage({ action: 'test', ...input });
    return String(data.message || 'SMTP connection verified');
  },
};
