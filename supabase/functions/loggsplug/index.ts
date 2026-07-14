import {
  calculateProfitNgn,
  calculateRetailPriceNgn,
  fetchLoggsplugProducts,
  fetchLoggsplugProfile,
  formatDeliveredDetails,
  hydrateLoggsplugProducts,
  isWeakLoggsplugDescription,
  mapLoggsplugCategoryToPlatform,
  mapLoggsplugCategoryToSlug,
  placeLoggsplugOrder,
  resolveLoggsplugProductIconUrl,
  resolveLoggsplugProductDescription,
  resolveLoggsplugLoginInstructions,
  slugifyLoggsplugProduct,
} from '../_shared/loggsplug-client.ts';
import {
  corsHeaders,
  getAuthenticatedUser,
  getServiceRoleClient,
  jsonResponse,
  requireAdmin,
} from '../_shared/sms-number-handler.ts';

type LoggsplugAction = 'overview' | 'sync_products' | 'purchase';

interface RequestBody {
  action?: LoggsplugAction;
  product_id?: string;
  quantity?: number;
  default_markup_percent?: number;
  /** Resume catalog sync from this index (chunked to stay under free-tier wall clock). */
  sync_offset?: number;
  /** Products to process per invoke (default 18, max 30). */
  sync_limit?: number;
}

interface LoggsplugSettings {
  enabled: boolean;
  defaultMarkupPercent: number;
  lastSyncedAt: string | null;
}

function normalizeSettings(value: unknown): LoggsplugSettings {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const markup = Number(record.defaultMarkupPercent);
  return {
    enabled: record.enabled !== false,
    defaultMarkupPercent: Number.isFinite(markup) && markup >= 0 ? markup : 15,
    lastSyncedAt: typeof record.lastSyncedAt === 'string' ? record.lastSyncedAt : null,
  };
}

async function loadSettings(admin: ReturnType<typeof getServiceRoleClient>) {
  const { data, error } = await admin
    .from('site_content_blocks')
    .select('value')
    .eq('key', 'loggsplug')
    .maybeSingle();

  if (error) throw error;
  return normalizeSettings(data?.value);
}

async function saveSettings(
  admin: ReturnType<typeof getServiceRoleClient>,
  settings: LoggsplugSettings,
) {
  const { error } = await admin
    .from('site_content_blocks')
    .upsert({
      key: 'loggsplug',
      value: settings,
    } as never, { onConflict: 'key' });

  if (error) throw error;
}

function resolveMarkupPercent(
  settings: LoggsplugSettings,
  productOverride: number | null | undefined,
) {
  const override = productOverride == null ? null : Number(productOverride);
  if (override != null && Number.isFinite(override) && override >= 0) {
    return override;
  }
  return settings.defaultMarkupPercent;
}

async function resolveCategoryId(
  admin: ReturnType<typeof getServiceRoleClient>,
  supplierCategory: string,
  categoryIconUrl?: string | null,
) {
  const label = supplierCategory.trim();
  const slug = mapLoggsplugCategoryToSlug(label);

  if (slug) {
    const { data: bySlug } = await admin
      .from('categories')
      .select('id, image_url, is_active')
      .eq('slug', slug)
      .maybeSingle();

    if (bySlug?.id) {
      if (!bySlug.is_active) {
        await admin
          .from('categories')
          .update({ is_active: true } as never)
          .eq('id', bySlug.id);
      }
      await maybeUpdateCategoryIcon(admin, bySlug.id as string, bySlug.image_url as string | null, categoryIconUrl);
      return bySlug.id as string;
    }
  }

  if (label) {
    const { data: byName } = await admin
      .from('categories')
      .select('id, image_url, is_active')
      .ilike('name', label)
      .maybeSingle();

    if (byName?.id) {
      if (!byName.is_active) {
        await admin
          .from('categories')
          .update({ is_active: true } as never)
          .eq('id', byName.id);
      }
      await maybeUpdateCategoryIcon(admin, byName.id as string, byName.image_url as string | null, categoryIconUrl);
      return byName.id as string;
    }
  }

  if (label) {
    const { data: maxSort } = await admin
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: created, error: createError } = await admin
      .from('categories')
      .insert({
        name: label,
        slug,
        description: `${label} products available on Nexlogs.`,
        image_url: categoryIconUrl ?? null,
        is_active: true,
        sort_order: Number(maxSort?.sort_order ?? 0) + 1,
      } as never)
      .select('id')
      .single();

    if (!createError && created?.id) {
      return created.id as string;
    }

    if (createError && slug) {
      const { data: raced } = await admin
        .from('categories')
        .select('id, image_url')
        .eq('slug', slug)
        .maybeSingle();

      if (raced?.id) {
        await maybeUpdateCategoryIcon(admin, raced.id as string, raced.image_url as string | null, categoryIconUrl);
        return raced.id as string;
      }
    }
  }

  for (const fallbackSlug of ['accounts', 'instagram', 'tools']) {
    const { data: fallback } = await admin
      .from('categories')
      .select('id')
      .eq('slug', fallbackSlug)
      .maybeSingle();

    if (fallback?.id) {
      return fallback.id as string;
    }
  }

  const { data: anyCategory, error: anyCategoryError } = await admin
    .from('categories')
    .select('id')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (anyCategoryError) throw anyCategoryError;
  if (!anyCategory?.id) {
    throw new Error('No marketplace categories found. Create at least one category before syncing LOGGSPLUG.');
  }

  return anyCategory.id as string;
}

async function maybeUpdateCategoryIcon(
  admin: ReturnType<typeof getServiceRoleClient>,
  categoryId: string,
  currentImageUrl: string | null,
  nextImageUrl?: string | null,
) {
  if (!nextImageUrl || currentImageUrl?.trim()) return;

  await admin
    .from('categories')
    .update({ image_url: nextImageUrl } as never)
    .eq('id', categoryId);
}

async function syncLoggsplugProductImage(
  admin: ReturnType<typeof getServiceRoleClient>,
  productId: string,
  iconUrl: string | null,
) {
  await admin
    .from('product_images')
    .delete()
    .eq('product_id', productId)
    .eq('sort_order', 0);

  if (!iconUrl) return;

  const { error } = await admin.from('product_images').insert({
    product_id: productId,
    image_url: iconUrl,
    sort_order: 0,
  } as never);

  if (error) {
    console.warn(`Could not sync LOGGSPLUG image for product ${productId}: ${error.message}`);
  }
}

async function syncSingleLoggsplugProduct(
  admin: ReturnType<typeof getServiceRoleClient>,
  settings: LoggsplugSettings,
  remote: Awaited<ReturnType<typeof fetchLoggsplugProducts>>[number],
) {
  const costNgn = Number(remote.reseller_price ?? remote.base_price ?? 0);
  const stock = Math.max(Number(remote.in_stock ?? 0), 0);
  const retailPrice = calculateRetailPriceNgn(costNgn, settings.defaultMarkupPercent);
  const iconUrl = resolveLoggsplugProductIconUrl(remote);
  const categoryId = await resolveCategoryId(admin, remote.category || '', iconUrl);
  const remoteDescription = resolveLoggsplugProductDescription(remote);
  const remoteLoginInstructions = resolveLoggsplugLoginInstructions(remote);
  const remoteName = remote.name.trim();
  const remoteCategory = remote.category?.trim() || '';

  const payload = {
    title: remoteName,
    slug: slugifyLoggsplugProduct(remote.name, remote.id),
    description: remoteDescription,
    platform: mapLoggsplugCategoryToPlatform(remote.category || ''),
    price: retailPrice,
    stock,
    supplier: 'loggsplug',
    supplier_product_id: remote.id,
    supplier_cost_ngn: costNgn,
    markup_percent_override: null,
    category_id: categoryId,
    niche: remote.category?.trim() || null,
    login_instructions: remoteLoginInstructions,
    preview_url: iconUrl,
    is_active: stock > 0,
    product_details: '',
    verified: false,
    featured: false,
  };

  const { data: existing, error: existingError } = await admin
    .from('products')
    .select('id, markup_percent_override, description, login_instructions')
    .eq('supplier', 'loggsplug')
    .eq('supplier_product_id', remote.id)
    .maybeSingle();

  if (existingError) throw existingError;

  let productId = existing?.id as string | undefined;

  if (existing?.id) {
    const existingDescription = typeof existing.description === 'string' ? existing.description : '';
    const existingInstructions =
      typeof existing.login_instructions === 'string' ? existing.login_instructions : '';

    // Never wipe a rich LOGGSPLUG description with a placeholder if detail hydration failed.
    const nextDescription =
      !isWeakLoggsplugDescription(remoteDescription, remoteName, remoteCategory) ||
      isWeakLoggsplugDescription(existingDescription, remoteName, remoteCategory)
        ? remoteDescription
        : existingDescription;

    const remoteInstructionsWeak =
      !remoteLoginInstructions.trim() ||
      /after purchase, open my purchases/i.test(remoteLoginInstructions);
    const existingInstructionsWeak =
      !existingInstructions.trim() ||
      /after purchase, open my purchases/i.test(existingInstructions);
    const nextLoginInstructions =
      !remoteInstructionsWeak || existingInstructionsWeak
        ? remoteLoginInstructions
        : existingInstructions;

    const effectiveMarkup = resolveMarkupPercent(settings, existing.markup_percent_override as number | null);
    const nextPrice = calculateRetailPriceNgn(costNgn, effectiveMarkup);
    const { error: updateError } = await admin
      .from('products')
      .update({
        title: payload.title,
        slug: payload.slug,
        description: nextDescription,
        platform: payload.platform,
        niche: payload.niche,
        login_instructions: nextLoginInstructions,
        preview_url: iconUrl,
        supplier_cost_ngn: costNgn,
        stock,
        price: nextPrice,
        category_id: categoryId,
        is_active: stock > 0,
      } as never)
      .eq('id', existing.id);

    if (updateError) throw updateError;
    productId = existing.id as string;
  } else {
    const { data: minSort } = await admin
      .from('products')
      .select('sort_order')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    const sort_order = (minSort?.sort_order ?? 1) - 1;
    const { data: inserted, error: insertError } = await admin
      .from('products')
      .insert({ ...payload, sort_order } as never)
      .select('id')
      .single();

    if (insertError || !inserted) throw insertError ?? new Error('Could not insert supplier product.');
    productId = inserted.id as string;
  }

  if (productId) {
    await syncLoggsplugProductImage(admin, productId, iconUrl);
  }
}

async function syncProducts(
  admin: ReturnType<typeof getServiceRoleClient>,
  settings: LoggsplugSettings,
  options: { offset?: number; limit?: number } = {},
) {
  // Reseller list is fast. Description hydration is slow on free tier (150s wall clock),
  // so each invoke only processes one chunk; the admin UI loops until complete.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 110_000;
  const remoteProducts = (await fetchLoggsplugProducts()).filter((product) => product?.id && product?.name);
  const total = remoteProducts.length;
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  // Cap each request so free-tier wall clock (150s) is not exceeded.
  // Client auto-loops with sync_offset until complete.
  const requestedLimit = options.limit == null ? 18 : Math.floor(options.limit);
  const limit = Math.min(30, Math.max(1, requestedLimit));
  const slice = remoteProducts.slice(offset, offset + limit);

  let upserted = 0;
  let processed = 0;
  const failures: { product_id: number; name: string; error: string }[] = [];
  const BATCH_SIZE = 6;

  for (let batchStart = 0; batchStart < slice.length; batchStart += BATCH_SIZE) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      break;
    }

    const batch = slice.slice(batchStart, batchStart + BATCH_SIZE);
    const hydratedBatch = await hydrateLoggsplugProducts(batch);

    for (const remote of hydratedBatch) {
      if (!remote?.id || !remote.name) continue;
      processed += 1;

      try {
        await syncSingleLoggsplugProduct(admin, settings, remote);
        upserted += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error.';
        failures.push({
          product_id: remote.id,
          name: remote.name.trim(),
          error: message,
        });
        console.error(`LOGGSPLUG sync failed for product ${remote.id}: ${message}`);
      }

      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        break;
      }
    }
  }

  if (upserted === 0 && failures.length > 0 && processed === slice.length) {
    throw new Error(failures[0]?.error || 'Catalog sync failed for all products in this chunk.');
  }

  if (total === 0) {
    throw new Error('LOGGSPLUG returned no products to sync.');
  }

  const nextOffset = offset + processed;
  const complete = nextOffset >= total;
  let deactivated = 0;
  let nextSettings = settings;

  if (complete) {
    const seenIds = new Set(remoteProducts.map((product) => product.id));
    const { data: staleProducts, error: staleError } = await admin
      .from('products')
      .select('id, supplier_product_id')
      .eq('supplier', 'loggsplug');

    if (staleError) throw staleError;

    const staleIds = (staleProducts || [])
      .filter((row) => !seenIds.has(Number(row.supplier_product_id)))
      .map((row) => row.id as string);

    if (staleIds.length > 0) {
      const { error: deactivateError } = await admin
        .from('products')
        .update({ is_active: false, stock: 0 } as never)
        .in('id', staleIds);

      if (deactivateError) throw deactivateError;
      deactivated = staleIds.length;
    }

    nextSettings = {
      ...settings,
      lastSyncedAt: new Date().toISOString(),
    };
    await saveSettings(admin, nextSettings);
  }

  return {
    synced: upserted,
    deactivated,
    failed: failures.length,
    failures: failures.slice(0, 10),
    offset,
    next_offset: complete ? null : nextOffset,
    processed,
    total,
    complete,
    settings: nextSettings,
  };
}

async function purchaseProduct(
  req: Request,
  userId: string,
  productId: string,
  quantity: number,
) {
  if (!productId) throw new Error('Product is required.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('Quantity must be between 1 and 10.');
  }

  const admin = getServiceRoleClient();
  const settings = await loadSettings(admin);
  if (!settings.enabled) {
    throw new Error('LOGGSPLUG supplier purchases are disabled.');
  }

  const { data: product, error: productError } = await admin
    .from('products')
    .select('id, title, price, stock, supplier, supplier_product_id, supplier_cost_ngn, markup_percent_override, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (productError || !product) {
    throw new Error('Product not found.');
  }

  if (product.supplier !== 'loggsplug' || product.supplier_product_id == null) {
    throw new Error('This product is not supplied by LOGGSPLUG.');
  }

  if (!product.is_active || Number(product.stock) < quantity) {
    throw new Error('Out of stock');
  }

  const retailPrice = Number(product.price);
  const costNgn = Number(product.supplier_cost_ngn ?? 0);
  const totalCharge = retailPrice * quantity;
  const markupPercent = resolveMarkupPercent(settings, product.markup_percent_override as number | null);
  const profitNgn = calculateProfitNgn(costNgn, markupPercent) * quantity;

  // Use service-role client + explicit user id. Passing the buyer JWT makes PostgREST
  // treat the caller as `authenticated`, which cannot EXECUTE these wallet RPCs.
  const walletClient = getServiceRoleClient();
  const { data: walletTxId, error: debitError } = await walletClient.rpc('wallet_debit_for_supplier_purchase', {
    p_amount_ngn: totalCharge,
    p_user_id: userId,
    p_metadata: {
      supplier: 'loggsplug',
      product_id: productId,
      supplier_product_id: product.supplier_product_id,
      quantity,
    },
  });

  if (debitError) {
    const message = debitError.message?.includes('INSUFFICIENT_FUNDS')
      ? 'INSUFFICIENT_FUNDS'
      : debitError.message || 'Could not debit wallet.';
    throw new Error(message);
  }

  const refundBuyer = async (reason: string) => {
    await walletClient.rpc('wallet_refund_supplier_purchase', {
      p_amount_ngn: totalCharge,
      p_reason: reason,
      p_user_id: userId,
      p_metadata: {
        supplier: 'loggsplug',
        product_id: productId,
        supplier_product_id: product.supplier_product_id,
        quantity,
      },
    });
  };

  let supplierResponse;
  try {
    supplierResponse = await placeLoggsplugOrder(Number(product.supplier_product_id), quantity);
  } catch (supplierError) {
    const message = supplierError instanceof Error ? supplierError.message : 'Supplier order failed.';
    await refundBuyer(message);
    throw supplierError;
  }

  if (!supplierResponse?.success) {
    const message = supplierResponse?.message || 'Supplier order failed.';
    await refundBuyer(message);
    throw new Error(message);
  }

  const delivered = Array.isArray(supplierResponse.delivered) ? supplierResponse.delivered : [];
  const deliveredDetails = formatDeliveredDetails(delivered);
  if (!deliveredDetails.trim()) {
    await refundBuyer('Supplier returned no account details.');
    throw new Error('Supplier returned no account details.');
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: userId,
      total_amount: totalCharge,
      discount_amount: 0,
      status: 'completed',
      payment_status: 'paid',
    } as never)
    .select('id, order_number, created_at')
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || 'Could not create order record.');
  }

  const { error: itemError } = await admin
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: productId,
      quantity,
      price: retailPrice,
      delivered_details: deliveredDetails,
    } as never);

  if (itemError) {
    throw new Error(itemError.message || 'Could not create order item.');
  }

  const nextStock = Math.max(Number(product.stock) - quantity, 0);
  await admin
    .from('products')
    .update({
      stock: nextStock,
      is_active: nextStock > 0,
    } as never)
    .eq('id', productId);

  await admin.from('loggsplug_orders').insert({
    user_id: userId,
    product_id: productId,
    supplier_order_id: String(supplierResponse.order_id ?? `pending-${crypto.randomUUID()}`),
    supplier_product_id: product.supplier_product_id,
    quantity,
    charged_ngn: totalCharge,
    cost_ngn: costNgn * quantity,
    profit_ngn: profitNgn,
    marketplace_order_id: order.id,
    wallet_transaction_id: walletTxId,
    status: 'completed',
    metadata: {
      supplier_message: supplierResponse.message ?? null,
      supplier_charged: supplierResponse.charged ?? null,
    },
  } as never);

  await admin.from('notifications').insert({
    user_id: userId,
    title: 'Purchase Completed',
    message: 'Your purchase has been completed successfully.',
    link: '/purchases',
  } as never);

  return {
    order_id: order.id as string,
    order_number: order.order_number,
    created_at: order.created_at,
    delivered_details: deliveredDetails,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json() as RequestBody;
    const action = body.action;
    if (!action) throw new Error('Action is required.');

    if (action === 'overview') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      const admin = getServiceRoleClient();
      const settings = await loadSettings(admin);
      const profile = await fetchLoggsplugProfile();

      const { count } = await admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('supplier', 'loggsplug')
        .eq('is_active', true)
        .gt('stock', 0);

      return jsonResponse({
        settings,
        balance_ngn: Number(profile.balance ?? 0),
        business_name: profile.business_name,
        active_products: count ?? 0,
      });
    }

    if (action === 'sync_products') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      const admin = getServiceRoleClient();
      const settings = normalizeSettings({
        ...await loadSettings(admin),
        ...(body.default_markup_percent != null
          ? { defaultMarkupPercent: body.default_markup_percent }
          : {}),
      });

      if (body.default_markup_percent != null) {
        await saveSettings(admin, settings);
      }

      const result = await syncProducts(admin, settings, {
        offset: body.sync_offset,
        limit: body.sync_limit,
      });
      return jsonResponse({ success: true, ...result });
    }

    if (action === 'purchase') {
      const { user } = await getAuthenticatedUser(req);
      const productId = body.product_id?.trim();
      const quantity = Number(body.quantity ?? 1);
      const result = await purchaseProduct(req, user.id, productId || '', quantity);
      return jsonResponse({ success: true, ...result });
    }

    throw new Error('Unsupported action.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LOGGSPLUG request failed.';
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;
    const status = message.toLowerCase().includes('authentication') || message.toLowerCase().includes('admin')
      ? 401
      : message.includes('INSUFFICIENT') || message.toLowerCase().includes('insufficient')
        ? 402
        : 400;
    return jsonResponse({ error: message, code }, status);
  }
});
