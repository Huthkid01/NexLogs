import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  isValidSmsVerificationCode,
  normalizeSmsVerificationCode,
} from './smspool-client.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(authHeader: string | null) {
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

export function getServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/** Service-role client that preserves auth.uid() from the caller JWT for wallet RPCs. */
export function getServiceRoleClientAsUser(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function getAuthenticatedUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment is not configured.');
  }

  const token = extractBearerToken(req.headers.get('Authorization'));
  if (!token) {
    throw new Error('Authentication required.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Authentication required.');
  }

  return { supabase, user: data.user };
}

export async function requireAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || profile?.role !== 'admin') {
    throw new Error('Admin access required.');
  }
}

export async function refundWallet(
  walletClient: ReturnType<typeof createClient>,
  amountNgn: number,
  reason: string,
  metadata: Record<string, unknown>,
  userId?: string,
) {
  // Prefer service-role helper with explicit user id. Calling wallet_refund_sms with a
  // buyer JWT is treated as `authenticated`, which is no longer granted EXECUTE.
  if (userId) {
    const { data, error } = await walletClient.rpc('wallet_refund_sms_for_user', {
      p_user_id: userId,
      p_amount_ngn: amountNgn,
      p_reason: reason,
      p_metadata: metadata,
    });

    if (!error) {
      return data as string;
    }

    // Fallback for environments that have not applied migration 088 yet.
    if (!error.message?.includes('Could not find the function') && !error.message?.includes('schema cache')) {
      throw new Error(error.message || 'Could not refund wallet.');
    }
  }

  const { data, error } = await walletClient.rpc('wallet_refund_sms', {
    p_amount_ngn: amountNgn,
    p_reason: reason,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(error.message || 'Could not refund wallet.');
  }

  return data as string;
}

const DEFAULT_SMS_ORDER_TTL_MS = 20 * 60 * 1000;

export function ensureSmsOrderExpiresAt(orderRow: Record<string, unknown>) {
  if (orderRow.expires_at) return String(orderRow.expires_at);
  const createdAt = new Date(String(orderRow.created_at ?? '')).getTime();
  const base = Number.isFinite(createdAt) ? createdAt : Date.now();
  return new Date(base + DEFAULT_SMS_ORDER_TTL_MS).toISOString();
}

async function findExistingSmsRefund(
  admin: ReturnType<typeof createClient>,
  userId: string,
  orderId: string,
) {
  const { data } = await admin
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .filter('metadata->>source', 'eq', 'sms_number_refund')
    .filter('metadata->>order_id', 'eq', orderId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id as string | undefined;
}

function getOrderMetadata(orderRow: Record<string, unknown>) {
  return orderRow.metadata && typeof orderRow.metadata === 'object'
    ? orderRow.metadata as Record<string, unknown>
    : {};
}

function orderCodeEverDelivered(orderRow: Record<string, unknown>) {
  const metadata = getOrderMetadata(orderRow);
  return metadata.code_ever_delivered === true
    || metadata.code_ever_delivered === 'true'
    || isValidSmsVerificationCode(metadata.previous_verification_code);
}

function computeRefundableNgn(orderRow: Record<string, unknown>) {
  if (isValidSmsVerificationCode(orderRow.verification_code)) {
    return 0;
  }

  if (orderCodeEverDelivered(orderRow)) {
    const resendCharge = Number(getOrderMetadata(orderRow).last_resend_charge_ngn);
    return Number.isFinite(resendCharge) && resendCharge > 0 ? resendCharge : 0;
  }

  const chargedNgn = Number(orderRow.charged_ngn);
  return Number.isFinite(chargedNgn) && chargedNgn > 0 ? chargedNgn : 0;
}

export function mapOrderRow(row: Record<string, unknown>) {
  const verificationCode = isValidSmsVerificationCode(row.verification_code)
    ? String(row.verification_code).trim()
    : null;

  return {
    id: row.id,
    smspool_order_id: row.smspool_order_id,
    phone_number: row.phone_number,
    country_id: row.country_id,
    country_name: row.country_name,
    service_id: row.service_id,
    service_name: row.service_name,
    status: row.status,
    verification_code: verificationCode,
    verification_message: row.verification_message,
    cost_usd: row.cost_usd,
    charged_ngn: row.charged_ngn,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRemoteOrderStatus(
  status: 'pending' | 'completed' | 'expired' | 'cancelled',
): 'active' | 'completed' | 'expired' | 'cancelled' {
  if (status === 'completed') return 'completed';
  if (status === 'expired') return 'expired';
  if (status === 'cancelled') return 'cancelled';
  return 'active';
}

function isRecentSmsOrder(orderRow: Record<string, unknown>, graceMs = 60_000) {
  const createdAt = new Date(String(orderRow.created_at ?? '')).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt < graceMs;
}

function normalizeSyncRemoteStatus(
  orderRow: Record<string, unknown>,
  status: 'pending' | 'completed' | 'expired' | 'cancelled',
  providerRefunded = false,
) {
  if (providerRefunded) return 'cancelled';
  if (isRecentSmsOrder(orderRow) && (status === 'cancelled' || status === 'expired')) {
    return 'pending';
  }
  return status;
}

function orderHasDeliveredCode(
  orderRow: Record<string, unknown>,
  remoteCode: string | null | undefined,
  remoteMessage?: string | null | undefined,
) {
  return isValidSmsVerificationCode(orderRow.verification_code)
    || isValidSmsVerificationCode(normalizeSmsVerificationCode(orderRow.verification_message))
    || isValidSmsVerificationCode(normalizeSmsVerificationCode(remoteMessage))
    || isValidSmsVerificationCode(remoteCode);
}

function isLocallyExpired(orderRow: Record<string, unknown>) {
  const expiresAt = new Date(ensureSmsOrderExpiresAt(orderRow)).getTime();
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

function hasRefundableBalance(orderRow: Record<string, unknown>) {
  if (computeRefundableNgn(orderRow) > 0) return true;
  const chargedNgn = Number(orderRow.charged_ngn);
  return Number.isFinite(chargedNgn) && chargedNgn > 0;
}

function resolveRefundWithoutCodeTarget(
  orderRow: Record<string, unknown>,
  remote: {
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    code: string | null;
    message?: string | null;
    providerRefunded?: boolean;
  },
): 'expired' | 'cancelled' | null {
  if (orderHasDeliveredCode(orderRow, remote.code, remote.message)) return null;
  if (!hasRefundableBalance(orderRow)) return null;
  if (remote.providerRefunded) return 'cancelled';
  if (isRecentSmsOrder(orderRow) && !isLocallyExpired(orderRow)) return null;

  const mapped = mapRemoteOrderStatus(
    normalizeSyncRemoteStatus(orderRow, remote.status, remote.providerRefunded),
  );
  if (mapped === 'cancelled') {
    return 'cancelled';
  }
  if (mapped === 'expired' || isLocallyExpired(orderRow)) {
    return 'expired';
  }
  return null;
}

export async function applyRemoteOrderUpdate(
  admin: ReturnType<typeof createClient>,
  orderRow: Record<string, unknown>,
  remote: {
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    code: string | null;
    message: string | null;
    timeLeftSeconds: number | null;
    expiresAt: string | null;
  },
) {
  const nextStatus = mapRemoteOrderStatus(remote.status);
  const normalizedCode = normalizeSmsVerificationCode(remote.code, remote.message);
  const existingCode = isValidSmsVerificationCode(orderRow.verification_code)
    ? String(orderRow.verification_code).trim()
    : null;
  const existingMetadata = getOrderMetadata(orderRow);
  const nextMetadata = {
    ...existingMetadata,
    ...(normalizedCode ? { code_ever_delivered: true } : {}),
  };

  const { data: updated } = await admin
    .from('sms_number_orders')
    .update({
      status: normalizedCode ? 'completed' : nextStatus === 'completed' ? 'active' : nextStatus,
      verification_code: normalizedCode ?? existingCode,
      verification_message: remote.message ?? orderRow.verification_message,
      metadata: nextMetadata,
      expires_at: remote.expiresAt
        ?? (remote.timeLeftSeconds
          ? new Date(Date.now() + remote.timeLeftSeconds * 1000).toISOString()
          : orderRow.expires_at),
    })
    .eq('id', orderRow.id)
    .select('*')
    .single();

  return (updated ?? orderRow) as Record<string, unknown>;
}

export async function syncSmsOrderFromRemote(
  userClient: ReturnType<typeof createClient>,
  admin: ReturnType<typeof createClient>,
  orderRow: Record<string, unknown>,
  remote: {
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    code: string | null;
    message: string | null;
    timeLeftSeconds: number | null;
    expiresAt: string | null;
    providerRefunded?: boolean;
  },
) {
  const orderWithExpiry = {
    ...orderRow,
    expires_at: orderRow.expires_at ?? remote.expiresAt ?? ensureSmsOrderExpiresAt(orderRow),
  };

  const normalizedStatus = normalizeSyncRemoteStatus(
    orderWithExpiry,
    remote.status,
    remote.providerRefunded,
  );
  const refundTarget = resolveRefundWithoutCodeTarget(orderWithExpiry, {
    status: normalizedStatus,
    code: remote.code,
    message: remote.message,
    providerRefunded: remote.providerRefunded,
  });

  if (refundTarget) {
    const reason = refundTarget === 'expired'
      ? 'SMS order expired without code'
      : 'SMS order cancelled without code';

    // Prefer service-role client so refunds still work after wallet RPC grants were hardened.
    const { data: refundTxId, error: refundError } = await admin.rpc('refund_sms_number_order_without_code', {
      p_order_id: orderRow.id,
      p_target_status: refundTarget,
      p_reason: reason,
    });

    if (refundError) {
      const { data: fallbackTxId, error: fallbackError } = await userClient.rpc(
        'refund_sms_number_order_without_code',
        {
          p_order_id: orderRow.id,
          p_target_status: refundTarget,
          p_reason: reason,
        },
      );

      if (fallbackError && !fallbackError.message?.includes('ORDER_NOT_REFUNDABLE')) {
        throw new Error(fallbackError.message || refundError.message || 'Could not refund expired SMS order.');
      }

      const { data: updated } = await admin
        .from('sms_number_orders')
        .select('*')
        .eq('id', orderRow.id)
        .single();

      const metadata = getOrderMetadata((updated ?? orderRow) as Record<string, unknown>);
      const actuallyRefunded = Boolean(fallbackTxId)
        || Boolean(metadata.refund_wallet_transaction_id);

      return {
        order: (updated ?? { ...orderRow, status: refundTarget }) as Record<string, unknown>,
        refunded: actuallyRefunded,
      };
    }

    const { data: updated } = await admin
      .from('sms_number_orders')
      .select('*')
      .eq('id', orderRow.id)
      .single();

    const metadata = getOrderMetadata((updated ?? orderRow) as Record<string, unknown>);
    const actuallyRefunded = Boolean(refundTxId)
      || Boolean(metadata.refund_wallet_transaction_id);

    return {
      order: (updated ?? { ...orderRow, status: refundTarget }) as Record<string, unknown>,
      refunded: actuallyRefunded,
    };
  }

  // Never mark expired/cancelled without going through the refund path above.
  const safeStatus = isValidSmsVerificationCode(remote.code)
    ? 'completed'
    : normalizedStatus === 'expired' || normalizedStatus === 'cancelled'
      ? 'pending'
      : normalizedStatus;

  const order = await applyRemoteOrderUpdate(admin, orderWithExpiry, {
    ...remote,
    status: safeStatus,
    code: remote.code,
    expiresAt: remote.expiresAt ?? String(orderWithExpiry.expires_at),
  });

  return { order, refunded: false };
}

export async function cancelSmsNumberOrderAtomic(
  admin: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  userId: string,
  orderRow: Record<string, unknown>,
  cancelProviderOrder: (externalOrderId: string) => Promise<unknown>,
) {
  const orderId = String(orderRow.id);
  const externalOrderId = String(orderRow.smspool_order_id);

  if (isValidSmsVerificationCode(orderRow.verification_code)) {
    throw new Error('ORDER_NOT_CANCELLABLE');
  }

  const refundableNgn = computeRefundableNgn(orderRow);
  if (refundableNgn <= 0) {
    throw new Error('ORDER_NOT_CANCELLABLE');
  }

  let workingOrder = orderRow;

  if (
    String(orderRow.status) === 'completed'
    && !isValidSmsVerificationCode(orderRow.verification_code)
  ) {
    const { data: reset } = await admin
      .from('sms_number_orders')
      .update({
        status: 'active',
        verification_code: null,
      })
      .eq('id', orderId)
      .eq('status', 'completed')
      .select('*')
      .maybeSingle();

    if (reset) {
      workingOrder = reset as Record<string, unknown>;
    }
  }

  await cancelProviderOrder(externalOrderId).catch(() => undefined);

  const existingRefundId = await findExistingSmsRefund(admin, userId, orderId);
  if (existingRefundId) {
    await admin
      .from('sms_number_orders')
      .update({
        status: 'cancelled',
        verification_code: null,
        metadata: {
          ...getOrderMetadata(workingOrder),
          refund_wallet_transaction_id: existingRefundId,
          cancelled_at: new Date().toISOString(),
        },
      })
      .eq('id', orderId)
      .in('status', ['active', 'completed', 'cancelled', 'expired']);

    const { data: updated } = await admin
      .from('sms_number_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    return {
      refundTxId: existingRefundId,
      order: (updated ?? { ...orderRow, status: 'cancelled' }) as Record<string, unknown>,
    };
  }

  // Refund first (service role), then mark cancelled — never leave a cancelled unpaid order.
  const { data: refundTxId, error: refundError } = await admin.rpc('refund_sms_number_order_without_code', {
    p_order_id: orderId,
    p_target_status: 'cancelled',
    p_reason: orderCodeEverDelivered(workingOrder)
      ? 'SMS resend cancelled without new code'
      : 'SMS order cancelled',
  });

  if (refundError || !refundTxId) {
    // Fallback for older DBs / partial failures
    try {
      const fallbackTxId = await refundWallet(
        admin,
        refundableNgn,
        orderCodeEverDelivered(workingOrder)
          ? 'SMS resend cancelled without new code'
          : 'SMS order cancelled',
        {
          order_id: orderId,
          smspool_order_id: externalOrderId,
          partial_refund: orderCodeEverDelivered(workingOrder),
        },
        userId,
      );

      await admin
        .from('sms_number_orders')
        .update({
          status: 'cancelled',
          verification_code: null,
          metadata: {
            ...getOrderMetadata(workingOrder),
            refund_wallet_transaction_id: fallbackTxId,
            cancelled_at: new Date().toISOString(),
          },
        })
        .eq('id', orderId);

      const { data: updated } = await admin
        .from('sms_number_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      return {
        refundTxId: fallbackTxId,
        order: (updated ?? { ...workingOrder, status: 'cancelled' }) as Record<string, unknown>,
      };
    } catch (fallbackError) {
      throw new Error(
        refundError?.message
          || (fallbackError instanceof Error ? fallbackError.message : 'Could not refund cancelled SMS order.'),
      );
    }
  }

  const { data: updated } = await admin
    .from('sms_number_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  return {
    refundTxId: String(refundTxId),
    order: (updated ?? { ...workingOrder, status: 'cancelled' }) as Record<string, unknown>,
  };
}
