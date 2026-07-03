import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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

type SmsPoolAction =
  | 'catalog'
  | 'price'
  | 'order'
  | 'check'
  | 'cancel'
  | 'resend'
  | 'sync_active'
  | 'history'
  | 'service_countries'
  | 'country_service_pools'
  | 'admin_overview'
  | 'admin_service_prices'
  | 'admin_provider_history';

const PUBLIC_SMSPOOL_ACTIONS = new Set<SmsPoolAction>(['catalog', 'country_service_pools']);

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

async function invokeSmsPool<T>(body: Record<string, unknown>): Promise<T> {
  const action = body.action as SmsPoolAction | undefined;
  const requiresAuth = !action || !PUBLIC_SMSPOOL_ACTIONS.has(action);

  if (requiresAuth) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Your session expired. Log in again and retry.');
    }
  }

  const { data, error } = await supabase.functions.invoke('smspool', { body });

  if (error || !data?.ok) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }

  return data as T;
}

export const smsNumberService = {
  async getCatalog() {
    return invokeSmsPool<{
      ok: true;
      countries: SmsPoolCountry[];
      services: SmsPoolService[];
      pricing: SmsPricingSettings;
    }>({ action: 'catalog' as SmsPoolAction });
  },

  async getServiceCountries(serviceId: string) {
    return invokeSmsPool<{
      ok: true;
      service_id: string;
      service_name: string | null;
      pricing: SmsPricingSettings;
      rows: SmsServicePriceRow[];
    }>({ action: 'service_countries' as SmsPoolAction, service: serviceId });
  },

  async getCountryServicePools(countryId: string, serviceId: string) {
    return invokeSmsPool<{
      ok: true;
      country_id: string;
      country_name: string | null;
      service_id: string;
      service_name: string | null;
      pricing: SmsPricingSettings;
      rows: SmsPoolPriceOptionRow[];
    }>({
      action: 'country_service_pools' as SmsPoolAction,
      country: countryId,
      service: serviceId,
    });
  },

  async getAdminOverview() {
    return invokeSmsPool<{
      ok: true;
      balance_usd: number;
      pricing: SmsPricingSettings;
      services: SmsPoolService[];
    }>({ action: 'admin_overview' as SmsPoolAction });
  },

  async getAdminServicePrices(serviceId: string) {
    return invokeSmsPool<{
      ok: true;
      service_id: string;
      service_name: string | null;
      pricing: SmsPricingSettings;
      rows: SmsServicePriceRow[];
    }>({ action: 'admin_service_prices' as SmsPoolAction, service: serviceId });
  },

  async getPrice(country: string, service: string) {
    return invokeSmsPool<{
      ok: true;
      cost_usd: number;
      charged_ngn: number;
      profit_ngn: number;
      pricing: SmsPricingSettings;
    }>({ action: 'price' as SmsPoolAction, country, service });
  },

  async orderNumber(country: string, service: string, pool?: string) {
    return invokeSmsPool<{ ok: true; order: SmsNumberOrder }>({
      action: 'order' as SmsPoolAction,
      country,
      service,
      pool,
    });
  },

  async checkOrder(orderId: string) {
    return invokeSmsPool<{ ok: true; order: SmsNumberOrder; time_left_seconds?: number | null }>({
      action: 'check' as SmsPoolAction,
      order_id: orderId,
    });
  },

  async syncActiveOrders() {
    return invokeSmsPool<{ ok: true; orders: SmsNumberOrder[]; refunded_orders?: string[] }>({
      action: 'sync_active' as SmsPoolAction,
    });
  },

  async resendOrder(orderId: string) {
    return invokeSmsPool<{ ok: true; order: SmsNumberOrder; message?: string; charged_ngn?: number }>({
      action: 'resend' as SmsPoolAction,
      order_id: orderId,
    });
  },

  async cancelOrder(orderId: string) {
    return invokeSmsPool<{ ok: true; order: SmsNumberOrder }>({
      action: 'cancel' as SmsPoolAction,
      order_id: orderId,
    });
  },

  async getHistory() {
    return invokeSmsPool<{ ok: true; orders: SmsNumberOrder[] }>({
      action: 'history' as SmsPoolAction,
    });
  },

  async getAdminProviderHistory() {
    return invokeSmsPool<{ ok: true; rows: SmsProviderHistoryOrder[] }>({
      action: 'admin_provider_history' as SmsPoolAction,
    });
  },
};
