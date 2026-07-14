import { supabase } from '@/lib/supabase';
import type { LoggsplugSettings } from '@/lib/loggsplug-pricing';

export interface LoggsplugOverview {
  settings: LoggsplugSettings;
  balance_ngn: number;
  business_name: string | null;
  active_products: number;
}

export interface LoggsplugSyncFailure {
  product_id: number;
  name: string;
  error: string;
}

export interface LoggsplugSyncChunkResult {
  success: boolean;
  synced: number;
  deactivated: number;
  failed?: number;
  failures?: LoggsplugSyncFailure[];
  offset: number;
  next_offset: number | null;
  processed: number;
  total: number;
  complete: boolean;
  settings: LoggsplugSettings;
}

export interface LoggsplugSyncResult {
  success: boolean;
  synced: number;
  deactivated: number;
  failed?: number;
  failures?: LoggsplugSyncFailure[];
  total?: number;
  settings: LoggsplugSettings;
}

export interface LoggsplugPurchaseResult {
  success: boolean;
  order_id: string;
  order_number?: string;
  created_at?: string;
  delivered_details?: string;
}

async function readFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') return null;

  const context = (error as { context?: Response }).context;
  if (context) {
    try {
      const payload = await context.clone().json() as { error?: string; msg?: string };
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
      }
      if (typeof payload?.msg === 'string' && payload.msg.trim()) {
        return payload.msg.trim();
      }
    } catch {
      // Fall through.
    }

    if (context.status === 504 || context.status === 546) {
      return `Edge Function timed out (HTTP ${context.status}). Sync is too long for one request — use chunked sync.`;
    }
    if (context.status >= 400) {
      return `Edge Function returned HTTP ${context.status}.`;
    }
  }

  const message = (error as { message?: string }).message;
  return message?.trim() || null;
}

async function invokeLoggsplug<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('loggsplug', { body });
  if (error) {
    const message = await readFunctionErrorMessage(error);
    throw new Error(message || 'LOGGSPLUG request failed.');
  }

  const payload = data as { error?: string; code?: string } & T;
  if (payload?.error) {
    throw new Error(payload.error);
  }

  return payload;
}

export const loggsplugService = {
  async getOverview(): Promise<LoggsplugOverview> {
    return invokeLoggsplug<LoggsplugOverview>({ action: 'overview' });
  },

  async syncProducts(
    defaultMarkupPercent?: number,
    onProgress?: (progress: { synced: number; total: number; complete: boolean }) => void,
  ): Promise<LoggsplugSyncResult> {
    let offset = 0;
    let synced = 0;
    let deactivated = 0;
    let failed = 0;
    const failures: LoggsplugSyncFailure[] = [];
    let settings: LoggsplugSettings | null = null;
    let total = 0;
    let guard = 0;

    while (guard < 40) {
      guard += 1;
      const chunk = await invokeLoggsplug<LoggsplugSyncChunkResult>({
        action: 'sync_products',
        sync_offset: offset,
        sync_limit: 18,
        ...(defaultMarkupPercent != null ? { default_markup_percent: defaultMarkupPercent } : {}),
      });

      synced += chunk.synced;
      deactivated += chunk.deactivated;
      failed += chunk.failed ?? 0;
      if (chunk.failures?.length) {
        failures.push(...chunk.failures);
      }
      settings = chunk.settings;
      total = chunk.total;
      onProgress?.({
        synced: Math.min(chunk.next_offset ?? chunk.total, chunk.total),
        total: chunk.total,
        complete: chunk.complete,
      });

      if (chunk.complete) {
        break;
      }

      if (chunk.next_offset == null || chunk.next_offset <= offset) {
        throw new Error('Catalog sync stalled without progress. Try again.');
      }
      offset = chunk.next_offset;
    }

    if (!settings) {
      throw new Error('Catalog sync returned no settings.');
    }

    return {
      success: true,
      synced,
      deactivated,
      failed,
      failures: failures.slice(0, 10),
      total,
      settings,
    };
  },

  async purchaseWithWallet(productId: string, quantity = 1): Promise<LoggsplugPurchaseResult> {
    return invokeLoggsplug<LoggsplugPurchaseResult>({
      action: 'purchase',
      product_id: productId,
      quantity,
    });
  },
};
