import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  calculateSmsChargeNgn,
  calculateSmsProfitNgn,
  isValidSmsVerificationCode,
  loadSmsPricingConfig,
  normalizeSmsVerificationCode,
} from '../_shared/smspool-client.ts';
import {
  banFiveSimOrder,
  cancelFiveSimOrder,
  checkFiveSimOrder,
  ensureFiveSimMaxPrice,
  fetchFiveSimBalance,
  fetchFiveSimCountries,
  fetchFiveSimOrderHistory,
  fetchFiveSimServicePrices,
  fetchFiveSimServices,
  finalizeFiveSimOrderIfCompleted,
  purchaseFiveSimNumber,
  resolveCountryServicePools,
} from '../_shared/fivesim-client.ts';
import {
  cancelSmsNumberOrderAtomic,
  corsHeaders,
  getAuthenticatedUser,
  getServiceRoleClient,
  jsonResponse,
  mapOrderRow,
  requireAdmin,
  syncSmsOrderFromRemote,
} from '../_shared/sms-number-handler.ts';

const SMS_PROVIDER = 'fivesim';

type FiveSimAction =
  | 'catalog'
  | 'order'
  | 'check'
  | 'cancel'
  | 'ban'
  | 'resend'
  | 'sync_active'
  | 'history'
  | 'country_service_pools'
  | 'admin_overview'
  | 'admin_service_prices'
  | 'admin_provider_history';

interface RequestBody {
  action?: FiveSimAction;
  country?: string;
  service?: string;
  pool?: string;
  order_id?: string;
}

function mapPoolPricingRows(
  rows: Awaited<ReturnType<typeof resolveCountryServicePools>>,
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
    const pricing = await loadSmsPricingConfig(admin, SMS_PROVIDER);

    if (action === 'catalog') {
      const [countries, services] = await Promise.all([
        fetchFiveSimCountries(),
        fetchFiveSimServices(),
      ]);

      return jsonResponse({
        ok: true,
        countries,
        services,
        pricing,
      });
    }

    if (action === 'country_service_pools') {
      if (!body.country?.trim() || !body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Country and service are required.' }, 400);
      }

      const country = body.country.trim();
      const service = body.service.trim();
      const countries = await fetchFiveSimCountries().catch(() => []);
      const services = await fetchFiveSimServices().catch(() => []);
      const pools = await resolveCountryServicePools(country, service);

      if (!pools.length) {
        return jsonResponse({
          ok: false,
          error: 'No numbers are available for this service and country right now. Try another country or service.',
        }, 404);
      }

      return jsonResponse({
        ok: true,
        country_id: country,
        country_name: countries.find((row) => row.id === country)?.name ?? null,
        service_id: service,
        service_name: services.find((row) => row.id === service)?.name ?? null,
        pricing,
        rows: mapPoolPricingRows(pools, pricing),
      });
    }

    if (action === 'admin_overview') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      const services = await fetchFiveSimServices();
      let balanceUsd = 0;
      let balanceError: string | null = null;

      try {
        balanceUsd = await fetchFiveSimBalance();
      } catch (error) {
        balanceError = error instanceof Error ? error.message : 'Could not load 5sim balance.';
      }

      return jsonResponse({
        ok: true,
        balance_usd: balanceUsd,
        balance_error: balanceError,
        pricing,
        services,
      });
    }

    if (action === 'admin_service_prices') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      if (!body.service?.trim()) {
        return jsonResponse({ ok: false, error: 'Service is required.' }, 400);
      }

      const service = body.service.trim();
      const services = await fetchFiveSimServices().catch(() => []);
      const serviceName = services.find((row) => row.id === service)?.name ?? null;
      const priceRows = await fetchFiveSimServicePrices(service);

      const rows = priceRows.map((row) => ({
        country_id: row.countryId,
        country_name: row.countryName,
        country_code: row.countryCode ?? null,
        pool: row.operator,
        cost_usd: row.costUsd,
        charged_ngn: calculateSmsChargeNgn(row.costUsd, pricing),
        profit_ngn: calculateSmsProfitNgn(row.costUsd, pricing),
        stock: row.stock,
      }));

      return jsonResponse({
        ok: true,
        service_id: service,
        service_name: serviceName,
        pricing,
        rows,
      });
    }

    if (action === 'admin_provider_history') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      const rows = await fetchFiveSimOrderHistory();

      return jsonResponse({
        ok: true,
        rows: rows.map((row) => ({
          orderId: row.orderId,
          phoneNumber: row.phoneNumber,
          service: row.service,
          countryCode: row.countryCode,
          status: row.status,
          code: row.code,
          costUsd: row.costUsd,
          createdAt: row.createdAt,
        })),
      });
    }

    const { supabase, user } = await getAuthenticatedUser(req);

    if (action === 'history') {
      const { data, error } = await supabase
        .from('sms_number_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', SMS_PROVIDER)
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
      const operator = body.pool?.trim() || 'any';
      const pools = await resolveCountryServicePools(country, service);
      const selectedPool = pools.find((row) => row.pool === operator) ?? pools[0];

      if (!selectedPool) {
        return jsonResponse({
          ok: false,
          error: 'No numbers are available for this service and country right now. Try another option.',
        }, 404);
      }

      const chargedNgn = calculateSmsChargeNgn(selectedPool.costUsd, pricing);

      await ensureFiveSimMaxPrice(service, selectedPool.costUsd);

      const { data: walletTxId, error: debitError } = await supabase.rpc('wallet_debit_for_sms', {
        p_amount_ngn: chargedNgn,
        p_metadata: {
          provider: SMS_PROVIDER,
          country_id: country,
          service_id: service,
          operator,
          quoted_cost_usd: selectedPool.costUsd,
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
        purchase = await purchaseFiveSimNumber(country, service, operator);
      } catch (purchaseError) {
        await supabase.rpc('wallet_refund_sms', {
          p_amount_ngn: chargedNgn,
          p_reason: '5sim purchase failed',
          p_metadata: { provider: SMS_PROVIDER, country_id: country, service_id: service },
        });

        const message = purchaseError instanceof Error
          ? purchaseError.message
          : 'Could not purchase number.';
        return jsonResponse({ ok: false, error: message }, 400);
      }

      const countries = await fetchFiveSimCountries().catch(() => []);
      const services = await fetchFiveSimServices().catch(() => []);
      const countryName = countries.find((row) => row.id === country)?.name ?? null;
      const serviceName = services.find((row) => row.id === service)?.name ?? null;
      const costUsd = purchase.costUsd > 0 ? purchase.costUsd : selectedPool.costUsd;

      const { data: orderRow, error: insertError } = await admin
        .from('sms_number_orders')
        .insert({
          user_id: user.id,
          provider: SMS_PROVIDER,
          smspool_order_id: purchase.orderId,
          phone_number: purchase.phoneNumber,
          country_id: country,
          country_name: countryName,
          service_id: service,
          service_name: serviceName,
          status: 'active',
          cost_usd: costUsd,
          charged_ngn: chargedNgn,
          expires_at: purchase.expiresAt,
          wallet_transaction_id: walletTxId,
          metadata: {
            provider: SMS_PROVIDER,
            operator,
            fivesim: purchase.raw,
            pricing,
            original_charged_ngn: chargedNgn,
          },
        })
        .select('*')
        .single();

      if (insertError || !orderRow) {
        await cancelFiveSimOrder(purchase.orderId).catch(() => undefined);
        await supabase.rpc('wallet_refund_sms', {
          p_amount_ngn: chargedNgn,
          p_reason: 'Could not save SMS order',
          p_metadata: { provider: SMS_PROVIDER, fivesim_order_id: purchase.orderId },
        });
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
        .eq('provider', SMS_PROVIDER)
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

      const updatedOrders: Record<string, unknown>[] = [];

      for (const orderRow of activeRows) {
        const check = await checkFiveSimOrder(String(orderRow.smspool_order_id));
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
              : orderRow.expires_at,
            providerRefunded: check.providerRefunded,
          },
        );
        await finalizeFiveSimOrderIfCompleted(
          String(orderRow.smspool_order_id),
          check.code,
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
        .eq('provider', SMS_PROVIDER)
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

      if (hasValidCode) {
        const { data: walletTxId, error: debitError } = await supabase.rpc('wallet_debit_for_sms', {
          p_amount_ngn: resendChargeNgn,
          p_metadata: {
            provider: SMS_PROVIDER,
            order_id: orderRow.id,
            fivesim_order_id: orderRow.smspool_order_id,
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
          ? 'Waiting for a new code on the same number. Your wallet was charged again.'
          : 'Request a new code on the service, then wait here for the SMS.',
        order: mapOrderRow((updated ?? orderRow) as Record<string, unknown>),
        charged_ngn: hasValidCode ? resendChargeNgn : 0,
      });
    }

    if (action === 'check' || action === 'cancel' || action === 'ban') {
      if (!body.order_id?.trim()) {
        return jsonResponse({ ok: false, error: 'Order ID is required.' }, 400);
      }

      const { data: orderRow, error: orderError } = await supabase
        .from('sms_number_orders')
        .select('*')
        .eq('id', body.order_id.trim())
        .eq('user_id', user.id)
        .eq('provider', SMS_PROVIDER)
        .maybeSingle();

      if (orderError || !orderRow) {
        return jsonResponse({ ok: false, error: 'Order not found.' }, 404);
      }

      if (action === 'cancel' || action === 'ban') {
        const providerAction = action === 'ban' ? banFiveSimOrder : cancelFiveSimOrder;

        try {
          const { refundTxId, order } = await cancelSmsNumberOrderAtomic(
            admin,
            supabase,
            user.id,
            orderRow as Record<string, unknown>,
            providerAction,
          );

          return jsonResponse({
            ok: true,
            refund_transaction_id: refundTxId,
            order: mapOrderRow(order),
          });
        } catch (cancelError) {
          const message = cancelError instanceof Error ? cancelError.message : 'Could not cancel order.';
          if (message.includes('ORDER_NOT_CANCELLABLE')) {
            return jsonResponse({
              ok: false,
              error: action === 'ban'
                ? 'This order can no longer be reported as used.'
                : 'This order can no longer be cancelled.',
            }, 400);
          }
          throw cancelError;
        }
      }

      const check = await checkFiveSimOrder(String(orderRow.smspool_order_id));
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
            : orderRow.expires_at,
          providerRefunded: check.providerRefunded,
        },
      );

      await finalizeFiveSimOrderIfCompleted(String(orderRow.smspool_order_id), check.code);

      return jsonResponse({
        ok: true,
        order: mapOrderRow(order),
        refunded,
        time_left_seconds: check.timeLeftSeconds,
      });
    }

    return jsonResponse({ ok: false, error: 'Unsupported action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : '5sim request failed';
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
