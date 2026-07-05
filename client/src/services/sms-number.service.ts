import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SmsNumberProvider = 'smspool' | 'fivesim';

export interface SmsPoolCountry {
  id: string;
  name: string;
  code?: string;
  flag?: string;
}

export interface SmsPoolService {
  id: string;
  name: string;
}

export interface SmsPricingSettings {
  usdNgnRate: number;
  markupPercent: number;
}

export type SmsPricingConfig = SmsPricingSettings;

/** @deprecated Use SmsPricingConfig */
export type SmsPoolPricing = SmsPricingConfig;

export interface SmsServicePriceRow {
  country_id: string;
  country_name: string;
  country_code: string | null;
  pool: string | null;
  cost_usd: number;
  charged_ngn: number;
  profit_ngn: number;
}

export interface SmsPoolPriceOptionRow {
  pool: string;
  pool_name: string;
  cost_usd: number;
  charged_ngn: number;
  profit_ngn: number;
  stock: number | null;
}

export interface SmsNumberOrder {
  id: string;
  smspool_order_id: string;
  phone_number: string;
  country_id: string;
  country_name: string | null;
  service_id: string;
  service_name: string | null;
  status: 'active' | 'completed' | 'cancelled' | 'refunded' | 'expired';
  verification_code: string | null;
  verification_message: string | null;
  cost_usd: number;
  charged_ngn: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsProviderHistoryOrder {
  orderId: string;
  phoneNumber: string | null;
  service: string | null;
  countryCode: string | null;
  status: string | null;
  code: string | null;
  costUsd: number | null;
  createdAt: string | null;
}

type SmsProviderAction =
  | 'catalog'
  | 'price'
  | 'order'
  | 'check'
  | 'cancel'
  | 'ban'
  | 'resend'
  | 'sync_active'
  | 'history'
  | 'service_countries'
  | 'country_service_pools'
  | 'admin_overview'
  | 'admin_service_prices'
  | 'admin_provider_history';

const PUBLIC_SMS_ACTIONS = new Set<SmsProviderAction>(['catalog', 'country_service_pools']);

function getFunctionName(provider: SmsNumberProvider) {
  return provider === 'fivesim' ? 'fivesim' : 'smspool';
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

  return 'SMS number request failed';
}

async function invokeSmsProvider<T>(
  provider: SmsNumberProvider,
  body: Record<string, unknown>,
): Promise<T> {
  const action = body.action as SmsProviderAction | undefined;
  const requiresAuth = !action || !PUBLIC_SMS_ACTIONS.has(action);

  if (requiresAuth) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Your session expired. Log in again and retry.');
    }
  }

  const { data, error } = await supabase.functions.invoke(getFunctionName(provider), { body });

  if (error || !data?.ok) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }

  return data as T;
}

export const smsNumberService = {
  async getCatalog(provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{
      ok: true;
      countries: SmsPoolCountry[];
      services: SmsPoolService[];
      pricing: SmsPricingSettings;
    }>(provider, { action: 'catalog' as SmsProviderAction });
  },

  async getServiceCountries(serviceId: string, provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{
      ok: true;
      service_id: string;
      service_name: string | null;
      pricing: SmsPricingSettings;
      rows: SmsServicePriceRow[];
    }>(provider, { action: 'service_countries' as SmsProviderAction, service: serviceId });
  },

  async getCountryServicePools(
    countryId: string,
    serviceId: string,
    provider: SmsNumberProvider = 'smspool',
  ) {
    return invokeSmsProvider<{
      ok: true;
      country_id: string;
      country_name: string | null;
      service_id: string;
      service_name: string | null;
      pricing: SmsPricingSettings;
      rows: SmsPoolPriceOptionRow[];
    }>(provider, {
      action: 'country_service_pools' as SmsProviderAction,
      country: countryId,
      service: serviceId,
    });
  },

  async getAdminOverview(provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{
      ok: true;
      balance_usd: number;
      balance_error?: string | null;
      pricing: SmsPricingSettings;
      services: SmsPoolService[];
    }>(provider, { action: 'admin_overview' as SmsProviderAction });
  },

  async getAdminServicePrices(serviceId: string, provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{
      ok: true;
      service_id: string;
      service_name: string | null;
      pricing: SmsPricingSettings;
      rows: SmsServicePriceRow[];
    }>(provider, { action: 'admin_service_prices' as SmsProviderAction, service: serviceId });
  },

  async getPrice(country: string, service: string, provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{
      ok: true;
      cost_usd: number;
      charged_ngn: number;
      profit_ngn: number;
      pricing: SmsPricingSettings;
    }>(provider, { action: 'price' as SmsProviderAction, country, service });
  },

  async orderNumber(
    country: string,
    service: string,
    pool?: string,
    provider: SmsNumberProvider = 'smspool',
  ) {
    return invokeSmsProvider<{ ok: true; order: SmsNumberOrder }>(provider, {
      action: 'order' as SmsProviderAction,
      country,
      service,
      pool,
    });
  },

  async checkOrder(orderId: string, provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{ ok: true; order: SmsNumberOrder; time_left_seconds?: number | null }>(
      provider,
      {
        action: 'check' as SmsProviderAction,
        order_id: orderId,
      },
    );
  },

  async syncActiveOrders(provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{ ok: true; orders: SmsNumberOrder[]; refunded_orders?: string[] }>(
      provider,
      {
        action: 'sync_active' as SmsProviderAction,
      },
    );
  },

  async resendOrder(orderId: string, provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{ ok: true; order: SmsNumberOrder; message?: string; charged_ngn?: number }>(
      provider,
      {
        action: 'resend' as SmsProviderAction,
        order_id: orderId,
      },
    );
  },

  async cancelOrder(orderId: string, provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{ ok: true; order: SmsNumberOrder }>(provider, {
      action: 'cancel' as SmsProviderAction,
      order_id: orderId,
    });
  },

  async banOrder(orderId: string, provider: SmsNumberProvider = 'fivesim') {
    return invokeSmsProvider<{ ok: true; order: SmsNumberOrder }>(provider, {
      action: 'ban' as SmsProviderAction,
      order_id: orderId,
    });
  },

  async getHistory(provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{ ok: true; orders: SmsNumberOrder[] }>(provider, {
      action: 'history' as SmsProviderAction,
    });
  },

  async getAdminProviderHistory(provider: SmsNumberProvider = 'smspool') {
    return invokeSmsProvider<{ ok: true; rows: SmsProviderHistoryOrder[] }>(provider, {
      action: 'admin_provider_history' as SmsProviderAction,
    });
  },
};
