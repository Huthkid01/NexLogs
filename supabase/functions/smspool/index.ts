import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  calculateSmsChargeNgn,
  calculateSmsProfitNgn,
  cancelSmsPoolOrder,
  checkSmsPoolOrder,
  fetchActiveSmsPoolOrders,
  fetchSmsPoolBalance,
  fetchSmsPoolCountries,
  fetchSmsPoolOrderHistory,
  fetchSmsPoolPrice,
  fetchSmsPoolServices,
  fetchSuggestedCountries,
  fetchValidPools,
  loadSmsPricingConfig,
  purchaseSmsPoolNumber,
  resendSmsPoolOrder,
  resolveCountryServicePools,
  isValidSmsVerificationCode,
  normalizeSmsVerificationCode,
} from '../_shared/smspool-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

interface RequestBody {
  action?: SmsPoolAction;
  country?: string;
  service?: string;
  pool?: string;
  order_id?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(authHeader: string | null) {
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function getServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getAuthenticatedUser(req: Request) {
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

async function requireAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || profile?.role !== 'admin') {
    throw new Error('Admin access required.');
  }
}

async function refundWallet(
  userClient: ReturnType<typeof createClient>,
  amountNgn: number,
  reason: string,
  metadata: Record<string, unknown>,
) {
  const { data, error } = await userClient.rpc('wallet_refund_sms', {
    p_amount_ngn: amountNgn,
    p_reason: reason,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(error.message || 'Could not refund wallet.');
  }

  return data as string;
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

async function cancelSmsNumberOrderAtomic(
  admin: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  userId: string,
  orderRow: Record<string, unknown>,
) {
  const orderId = String(orderRow.id);
  const smspoolOrderId = String(orderRow.smspool_order_id);

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

  await cancelSmsPoolOrder(smspoolOrderId).catch(() => undefined);

  const existingRefundId = await findExistingSmsRefund(admin, userId, orderId);
  if (existingRefundId) {
    await admin
      .from('sms_number_orders')
      .update({
        status: 'cancelled',
        verification_code: null,
        metadata: {
          ...(workingOrder.metadata && typeof workingOrder.metadata === 'object'
            ? workingOrder.metadata as Record<string, unknown>
            : {}),
          refund_wallet_transaction_id: existingRefundId,
          cancelled_at: new Date().toISOString(),
        },
      })
      .eq('id', orderId)
      .in('status', ['active', 'completed']);

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

  const { data: locked, error: lockError } = await admin
    .from('sms_number_orders')
    .update({
      status: 'cancelled',
      verification_code: null,
      metadata: {
        ...(workingOrder.metadata && typeof workingOrder.metadata === 'object'
          ? workingOrder.metadata as Record<string, unknown>
          : {}),
        cancelled_at: new Date().toISOString(),
      },
    })
    .eq('id', orderId)
    .in('status', ['active', 'completed'])
    .select('*')
    .maybeSingle();

  if (lockError) {
    throw new Error(lockError.message || 'Could not cancel order.');
  }

  if (!locked) {
    const currentStatus = String(orderRow.status ?? '');
    if (currentStatus === 'cancelled' || currentStatus === 'refunded') {
      const refundTxId = existingRefundId ?? await findExistingSmsRefund(admin, userId, orderId);
      const { data: updated } = await admin
        .from('sms_number_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      return {
        refundTxId: refundTxId ?? null,
        order: (updated ?? orderRow) as Record<string, unknown>,
      };
    }

    throw new Error('ORDER_NOT_CANCELLABLE');
  }

  let refundTxId: string | null = null;
  try {
    refundTxId = await refundWallet(
      userClient,
      refundableNgn,
      orderCodeEverDelivered(locked)
        ? 'SMS resend cancelled without new code'
        : 'SMS order cancelled',
      {
        order_id: orderId,
        smspool_order_id: smspoolOrderId,
        partial_refund: orderCodeEverDelivered(locked),
      },
    );
  } catch (refundError) {
    await admin
      .from('sms_number_orders')
      .update({ status: 'active' })
      .eq('id', orderId)
      .eq('status', 'cancelled');
    throw refundError;
  }

  const { data: updated } = await admin
    .from('sms_number_orders')
    .update({
      metadata: {
        ...(locked.metadata && typeof locked.metadata === 'object'
          ? locked.metadata as Record<string, unknown>
          : {}),
        refund_wallet_transaction_id: refundTxId,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  return {
    refundTxId,
    order: (updated ?? locked) as Record<string, unknown>,
  };
}

function mapOrderRow(row: Record<string, unknown>) {
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

function mapPoolPricingRows(
  rows: Awaited<ReturnType<typeof fetchValidPools>>,
  pricing: Awaited<ReturnType<typeof loadSmsPricingConfig>>,
) {
  return rows.map((row) => ({
    pool: row.pool,
    pool_name: row.poolName,
    cost_usd: row.costUsd,
    charged_ngn: calculateSmsChargeNgn(row.costUsd, pricing),
    profit_ngn: calculateSmsProfitNgn(row.costUsd, pricing),
    stock: row.stock,
  }));
}

function mapPricingRows(
  rows: Awaited<ReturnType<typeof fetchSuggestedCountries>>,
  pricing: Awaited<ReturnType<typeof loadSmsPricingConfig>>,
) {
  return rows.map((row) => ({
    country_id: row.countryId,
    country_name: row.countryName,
    country_code: row.countryCode ?? null,
    pool: row.pool ?? null,
    cost_usd: row.costUsd,
    charged_ngn: calculateSmsChargeNgn(row.costUsd, pricing),
    profit_ngn: calculateSmsProfitNgn(row.costUsd, pricing),
  }));
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

function isLocallyExpired(orderRow: Record<string, unknown>) {
  const expiresAt = orderRow.expires_at ? new Date(String(orderRow.expires_at)).getTime() : NaN;
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
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
  if (computeRefundableNgn(orderRow) <= 0) return null;
  if (remote.providerRefunded) return 'cancelled';
  if (isRecentSmsOrder(orderRow)) return null;

  const mapped = mapRemoteOrderStatus(
    normalizeSyncRemoteStatus(orderRow, remote.status, remote.providerRefunded),
  );
  if (mapped === 'expired' || isLocallyExpired(orderRow)) {
    return 'expired';
  }
  if (mapped === 'cancelled') {
    return 'cancelled';
  }
  return null;
}

async function syncSmsOrderFromRemote(
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
  const normalizedStatus = normalizeSyncRemoteStatus(
    orderRow,
    remote.status,
    remote.providerRefunded,
  );
  const refundTarget = resolveRefundWithoutCodeTarget(orderRow, {
    status: normalizedStatus,
    code: remote.code,
    providerRefunded: remote.providerRefunded,
  });

  if (refundTarget) {
    const reason = refundTarget === 'expired'
      ? 'SMS order expired without code'
      : 'SMS order cancelled without code';

    const { error: refundError } = await userClient.rpc('refund_sms_number_order_without_code', {
      p_order_id: orderRow.id,
      p_target_status: refundTarget,
      p_reason: reason,
    });

    if (refundError && !refundError.message?.includes('ORDER_NOT_REFUNDABLE')) {
      throw new Error(refundError.message || 'Could not refund expired SMS order.');
    }

    const { data: updated } = await admin
      .from('sms_number_orders')
      .select('*')
      .eq('id', orderRow.id)
      .single();

    return {
      order: (updated ?? { ...orderRow, status: refundTarget }) as Record<string, unknown>,
      refunded: true,
    };
  }

  const effectiveStatus = isValidSmsVerificationCode(remote.code)
    ? 'completed'
    : normalizedStatus;

  const order = await applyRemoteOrderUpdate(admin, orderRow, {
    ...remote,
    status: effectiveStatus,
    code: remote.code,
  });

  return { order, refunded: false };
}

async function applyRemoteOrderUpdate(
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as RequestBody;
    const action = body.action;

    if (!action) {
      return jsonResponse({ ok: false, error: 'Action is required.' }, 400);
    }

    const admin = getServiceRoleClient();
    const pricing = await loadSmsPricingConfig(admin);

    if (action === 'catalog') {
      const [countries, services] = await Promise.all([
        fetchSmsPoolCountries(),
        fetchSmsPoolServices(),
      ]);

      return jsonResponse({
        ok: true,
        countries,
        services,
        pricing,
      });
    }

    if (action === 'service_countries') {
      const { supabase, user } = await getAuthenticatedUser(req);
      void supabase;
      void user;

      if (!body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Service is required.' }, 400);
      }

      const rows = await fetchSuggestedCountries(body.service.trim());
      const serviceName = (await fetchSmsPoolServices())
        .find((service) => service.id === body.service?.trim())?.name ?? null;

      return jsonResponse({
        ok: true,
        service_id: body.service.trim(),
        service_name: serviceName,
        pricing,
        rows: mapPricingRows(rows, pricing),
      });
    }

    if (action === 'country_service_pools') {
      if (!body.country?.trim() || !body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Country and service are required.' }, 400);
      }

      const country = body.country.trim();
      const service = body.service.trim();
      const countries = await fetchSmsPoolCountries().catch(() => []);
      const pools = await resolveCountryServicePools(country, service, countries);

      const serviceName = (await fetchSmsPoolServices())
        .find((row) => row.id === service)?.name ?? null;
      const countryName = countries.find((row) => row.id === country)?.name ?? null;

      if (!pools.length) {
        return jsonResponse({
          ok: false,
          error: 'No numbers are available for this service and country right now. Try another country or service.',
        }, 404);
      }

      return jsonResponse({
        ok: true,
        country_id: country,
        country_name: countryName,
        service_id: service,
        service_name: serviceName,
        pricing,
        rows: mapPoolPricingRows(pools, pricing),
      });
    }

    if (action === 'admin_overview' || action === 'admin_service_prices') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      if (action === 'admin_overview') {
        const [balanceUsd, services] = await Promise.all([
          fetchSmsPoolBalance(),
          fetchSmsPoolServices(),
        ]);

        return jsonResponse({
          ok: true,
          balance_usd: balanceUsd,
          pricing,
          services,
        });
      }

      if (!body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Service is required.' }, 400);
      }

      const rows = await fetchSuggestedCountries(body.service.trim());
      const serviceName = (await fetchSmsPoolServices())
        .find((service) => service.id === body.service?.trim())?.name ?? null;

      return jsonResponse({
        ok: true,
        service_id: body.service.trim(),
        service_name: serviceName,
        pricing,
        rows: mapPricingRows(rows, pricing),
      });
    }

    if (action === 'admin_provider_history') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      const rows = await fetchSmsPoolOrderHistory();

      return jsonResponse({
        ok: true,
        rows,
      });
    }

    const { supabase, user } = await getAuthenticatedUser(req);

    if (action === 'price') {
      if (!body.country?.trim() || !body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Country and service are required.' }, 400);
      }

      const quote = await fetchSmsPoolPrice(body.country.trim(), body.service.trim());
      const chargedNgn = calculateSmsChargeNgn(quote.costUsd, pricing);
      const profitNgn = calculateSmsProfitNgn(quote.costUsd, pricing);

      return jsonResponse({
        ok: true,
        cost_usd: quote.costUsd,
        charged_ngn: chargedNgn,
        profit_ngn: profitNgn,
        pricing,
      });
    }

    if (action === 'history') {
      const { data, error } = await supabase
        .from('sms_number_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      return jsonResponse({
        ok: true,
        orders: (data ?? []).map((row) => mapOrderRow(row as Record<string, unknown>)),
      });
    }

    if (action === 'order') {
      if (!body.country?.trim() || !body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Country and service are required.' }, 400);
      }

      const country = body.country.trim();
      const service = body.service.trim();
      const pool = body.pool?.trim() || undefined;
      const quote = await fetchSmsPoolPrice(country, service, pool);
      const chargedNgn = calculateSmsChargeNgn(quote.costUsd, pricing);

      const { data: walletTxId, error: debitError } = await supabase.rpc('wallet_debit_for_sms', {
        p_amount_ngn: chargedNgn,
        p_metadata: {
          country_id: country,
          service_id: service,
          pool,
          quoted_cost_usd: quote.costUsd,
          markup_percent: pricing.markupPercent,
          usd_ngn_rate: pricing.usdNgnRate,
        },
      });

      if (debitError) {
        const message = debitError.message?.includes('INSUFFICIENT_FUNDS')
          ? 'Insufficient wallet balance. Please add funds.'
          : debitError.message || 'Could not debit wallet.';
        return jsonResponse({ ok: false, error: message }, 400);
      }

      let purchase;

      try {
        purchase = await purchaseSmsPoolNumber(country, service, quote.costUsd * 1.2, pool);
      } catch (purchaseError) {
        await refundWallet(
          supabase,
          chargedNgn,
          'SMS Pool purchase failed',
          { country_id: country, service_id: service },
        );

        const message = purchaseError instanceof Error
          ? purchaseError.message
          : 'Could not purchase number.';
        return jsonResponse({ ok: false, error: message }, 400);
      }

      const countries = await fetchSmsPoolCountries().catch(() => []);
      const services = await fetchSmsPoolServices().catch(() => []);
      const countryName = countries.find((row) => row.id === country)?.name ?? null;
      const serviceName = services.find((row) => row.id === service)?.name ?? null;

      const { data: orderRow, error: insertError } = await admin
        .from('sms_number_orders')
        .insert({
          user_id: user.id,
          smspool_order_id: purchase.orderId,
          phone_number: purchase.phoneNumber,
          country_id: country,
          country_name: countryName,
          service_id: service,
          service_name: serviceName,
          status: 'active',
          cost_usd: purchase.costUsd || quote.costUsd,
          charged_ngn: chargedNgn,
          expires_at: purchase.expiresAt,
          wallet_transaction_id: walletTxId,
          metadata: {
            smspool: purchase.raw,
            pricing,
            original_charged_ngn: chargedNgn,
          },
        })
        .select('*')
        .single();

      if (insertError || !orderRow) {
        await cancelSmsPoolOrder(purchase.orderId).catch(() => undefined);
        await refundWallet(
          supabase,
          chargedNgn,
          'Could not save SMS order',
          { smspool_order_id: purchase.orderId },
        );
        throw new Error(insertError?.message || 'Could not save SMS order.');
      }

      return jsonResponse({
        ok: true,
        order: mapOrderRow(orderRow as Record<string, unknown>),
      });
    }

    if (action === 'sync_active') {
      const { data: localOrders, error: localError } = await supabase
        .from('sms_number_orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'expired', 'completed'])
        .order('created_at', { ascending: false });

      if (localError) {
        throw new Error(localError.message);
      }

      const activeRows = (localOrders ?? []).filter((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object'
          ? row.metadata as Record<string, unknown>
          : {};
        if (metadata.refund_wallet_transaction_id) return false;

        if (row.status === 'active') return true;
        if (row.status === 'completed' && !isValidSmsVerificationCode(row.verification_code)) {
          return true;
        }
        if (row.status !== 'expired') return false;
        return true;
      });
      if (!activeRows.length) {
        return jsonResponse({ ok: true, orders: [] });
      }

      const remoteActive = await fetchActiveSmsPoolOrders();
      const remoteByOrderId = new Map(
        remoteActive.map((row) => [row.orderId, row]),
      );

      const updatedOrders: Record<string, unknown>[] = [];

      for (const orderRow of activeRows) {
        const remote = remoteByOrderId.get(String(orderRow.smspool_order_id));
        if (remote) {
          const { order } = await syncSmsOrderFromRemote(
            supabase,
            admin,
            orderRow as Record<string, unknown>,
            {
              status: remote.status,
              code: remote.code,
              message: remote.message,
              timeLeftSeconds: remote.timeLeftSeconds,
              expiresAt: remote.expiresAt,
              providerRefunded: remote.providerRefunded,
            },
          );
          updatedOrders.push(order);
          continue;
        }

        const check = await checkSmsPoolOrder(String(orderRow.smspool_order_id));
        const { order } = await syncSmsOrderFromRemote(
          supabase,
          admin,
          orderRow as Record<string, unknown>,
          {
            status: check.status,
            code: check.code,
            message: check.message,
            timeLeftSeconds: check.timeLeftSeconds,
            expiresAt: check.timeLeftSeconds
              ? new Date(Date.now() + check.timeLeftSeconds * 1000).toISOString()
              : null,
            providerRefunded: check.providerRefunded,
          },
        );
        updatedOrders.push(order);
      }

      return jsonResponse({
        ok: true,
        orders: updatedOrders.map((row) => mapOrderRow(row)),
        refunded_orders: updatedOrders
          .filter((row) => row.status === 'expired' || row.status === 'cancelled')
          .map((row) => row.id),
      });
    }

    if (action === 'resend') {
      if (!body.order_id?.trim()) {
        return jsonResponse({ ok: false, error: 'Order ID is required.' }, 400);
      }

      const { data: orderRow, error: orderError } = await supabase
        .from('sms_number_orders')
        .select('*')
        .eq('id', body.order_id.trim())
        .eq('user_id', user.id)
        .maybeSingle();

      if (orderError || !orderRow) {
        return jsonResponse({ ok: false, error: 'Order not found.' }, 404);
      }

      const hasValidCode = isValidSmsVerificationCode(orderRow.verification_code);
      const isActive = orderRow.status === 'active';

      if (!isActive && !hasValidCode) {
        return jsonResponse({ ok: false, error: 'This order cannot be resent.' }, 400);
      }

      if (!isActive && hasValidCode && orderRow.status !== 'completed') {
        return jsonResponse({ ok: false, error: 'This order cannot be resent.' }, 400);
      }

      const resendChargeNgn = calculateSmsChargeNgn(Number(orderRow.cost_usd), pricing);
      if (!Number.isFinite(resendChargeNgn) || resendChargeNgn <= 0) {
        return jsonResponse({ ok: false, error: 'Invalid resend charge amount.' }, 400);
      }

      const existingMetadata = orderRow.metadata && typeof orderRow.metadata === 'object'
        ? orderRow.metadata as Record<string, unknown>
        : {};
      const lastResendAt = String(existingMetadata.last_resend_at ?? '');
      if (lastResendAt) {
        const elapsedMs = Date.now() - new Date(lastResendAt).getTime();
        if (Number.isFinite(elapsedMs) && elapsedMs < 5_000) {
          return jsonResponse({ ok: false, error: 'Please wait a few seconds before resending again.' }, 400);
        }
      }

      let resendWalletTxId: string | null = null;

      try {
        await resendSmsPoolOrder(String(orderRow.smspool_order_id));
      } catch (resendError) {
        const message = resendError instanceof Error ? resendError.message : 'Could not resend SMS.';
        return jsonResponse({ ok: false, error: message }, 400);
      }

      if (hasValidCode) {
        const { data: walletTxId, error: debitError } = await supabase.rpc('wallet_debit_for_sms', {
          p_amount_ngn: resendChargeNgn,
          p_metadata: {
            order_id: orderRow.id,
            smspool_order_id: orderRow.smspool_order_id,
            resend: true,
          },
        });

        if (debitError) {
          const message = debitError.message?.includes('INSUFFICIENT_FUNDS')
            ? 'Insufficient wallet balance. Please add funds.'
            : debitError.message || 'Could not debit wallet for resend.';
          return jsonResponse({ ok: false, error: message }, 400);
        }

        resendWalletTxId = walletTxId as string;
      }

      const resendCount = Number(existingMetadata.resend_count ?? 0) + 1;

      const metadata = {
        ...existingMetadata,
        last_resend_at: new Date().toISOString(),
        resend_count: resendCount,
        code_ever_delivered: true,
        ...(hasValidCode ? {
          last_resend_charge_ngn: resendChargeNgn,
          last_resend_wallet_transaction_id: resendWalletTxId,
          previous_verification_code: String(orderRow.verification_code).trim(),
        } : {}),
      };

      const { data: updated } = await admin
        .from('sms_number_orders')
        .update({
          status: 'active',
          verification_code: null,
          verification_message: null,
          charged_ngn: hasValidCode
            ? Number(orderRow.charged_ngn) + resendChargeNgn
            : orderRow.charged_ngn,
          metadata,
        })
        .eq('id', orderRow.id)
        .select('*')
        .single();

      return jsonResponse({
        ok: true,
        message: hasValidCode
          ? 'New SMS requested. Your wallet was charged again. Waiting for the new code...'
          : 'SMS resend requested. Request a new code on the service, then wait here.',
        order: mapOrderRow((updated ?? orderRow) as Record<string, unknown>),
        charged_ngn: hasValidCode ? resendChargeNgn : 0,
      });
    }

    if (action === 'check' || action === 'cancel') {
      if (!body.order_id?.trim()) {
        return jsonResponse({ ok: false, error: 'Order ID is required.' }, 400);
      }

      const { data: orderRow, error: orderError } = await supabase
        .from('sms_number_orders')
        .select('*')
        .eq('id', body.order_id.trim())
        .eq('user_id', user.id)
        .maybeSingle();

      if (orderError || !orderRow) {
        return jsonResponse({ ok: false, error: 'Order not found.' }, 404);
      }

      if (action === 'cancel') {
        try {
          const { refundTxId, order } = await cancelSmsNumberOrderAtomic(
            admin,
            supabase,
            user.id,
            orderRow as Record<string, unknown>,
          );

          return jsonResponse({
            ok: true,
            refund_transaction_id: refundTxId,
            order: mapOrderRow(order),
          });
        } catch (cancelError) {
          const message = cancelError instanceof Error ? cancelError.message : 'Could not cancel order.';
          if (message.includes('ORDER_NOT_CANCELLABLE')) {
            return jsonResponse({ ok: false, error: 'This order can no longer be cancelled.' }, 400);
          }
          if (message.includes('wallet_sms_refund_order_unique') || message.includes('duplicate key')) {
            const { data: updated } = await admin
              .from('sms_number_orders')
              .select('*')
              .eq('id', orderRow.id)
              .single();

            return jsonResponse({
              ok: true,
              order: mapOrderRow((updated ?? { ...orderRow, status: 'cancelled' }) as Record<string, unknown>),
            });
          }
          throw cancelError;
        }
      }

      const check = await checkSmsPoolOrder(orderRow.smspool_order_id);
      const { order, refunded } = await syncSmsOrderFromRemote(
        supabase,
        admin,
        orderRow as Record<string, unknown>,
        {
          status: check.status,
          code: check.code,
          message: check.message,
          timeLeftSeconds: check.timeLeftSeconds,
          expiresAt: check.timeLeftSeconds
            ? new Date(Date.now() + check.timeLeftSeconds * 1000).toISOString()
            : null,
          providerRefunded: check.providerRefunded,
        },
      );

      return jsonResponse({
        ok: true,
        order: mapOrderRow(order),
        refunded,
        time_left_seconds: check.timeLeftSeconds,
      });
    }

    return jsonResponse({ ok: false, error: 'Unsupported action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMS Pool request failed';
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
