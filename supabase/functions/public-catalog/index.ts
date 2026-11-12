/**
 * Public marketplace catalog cache.
 * Only returns data guests can already see — never wallets, orders, or credentials.
 * Redis is server-side only; browsers never receive Redis credentials.
 */
import {
  corsHeaders,
  getAuthenticatedUser,
  getServiceRoleClient,
  jsonResponse,
  requireAdmin,
} from '../_shared/http.ts';
import {
  REDIS_KEYS,
  REDIS_TTL,
  cacheDel,
  invalidatePublicListingCaches,
  withCache,
} from '../_shared/redis-cache.ts';
import { captureEdgeException, initEdgeSentry } from '../_shared/sentry.ts';

initEdgeSentry('public-catalog');

const PUBLIC_PRODUCT_COLUMNS =
  'id, title, slug, description, platform, price, stock, followers, following, account_age, country, niche, verified, featured, category_id, is_active, created_at, updated_at, sort_order, preview_url, login_instructions, supplier, supplier_product_id';

const PUBLIC_PRODUCT_SELECT =
  `${PUBLIC_PRODUCT_COLUMNS}, category:categories(id, name, slug, image_url, is_active, sort_order), product_images(image_url, sort_order)`;

type CatalogAction =
  | 'categories'
  | 'featured'
  | 'home'
  | 'products'
  | 'invalidate'
  | 'invalidate-listings';

interface RequestBody {
  action?: CatalogAction;
  limit?: number;
  search?: string;
  platform?: string;
  category_id?: string;
  sort?: string;
  page?: number;
  page_limit?: number;
}

function fingerprintProducts(body: RequestBody) {
  return [
    body.search?.trim() || '',
    body.platform || '',
    body.category_id || '',
    body.sort || 'newest',
    String(body.page || 1),
    String(body.page_limit || 10),
  ].join('|');
}

type ShopAvailability = {
  platforms: string[];
  categorySlugs: string[];
};

async function loadShopAvailability(
  admin: ReturnType<typeof getServiceRoleClient>,
): Promise<ShopAvailability> {
  const { data, error } = await admin
    .from('products')
    .select('platform, supplier, category:categories(slug)')
    .eq('is_active', true)
    .gt('stock', 0)
    .not('slug', 'like', '%-rdp-%');
  if (error) throw error;

  const platforms = new Set<string>();
  const categorySlugs = new Set<string>();

  for (const row of data ?? []) {
    if ((row as { supplier?: string | null }).supplier === 'loggsplug') continue;
    const platform = (row as { platform?: string | null }).platform;
    if (platform) platforms.add(platform);
    const slug = (row as { category?: { slug?: string | null } | null }).category?.slug?.trim();
    if (slug) categorySlugs.add(slug);
  }

  return {
    platforms: [...platforms],
    categorySlugs: [...categorySlugs],
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

    const admin = getServiceRoleClient();

    if (action === 'categories') {
      const categories = await withCache(
        REDIS_KEYS.categories,
        REDIS_TTL.categories,
        async () => {
          const { data, error } = await admin
            .from('categories')
            .select('id, name, slug, image_url, is_active, sort_order, created_at, updated_at')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          if (error) throw error;
          return data ?? [];
        },
      );

      return jsonResponse({ success: true, categories });
    }

    if (action === 'featured') {
      const limit = Math.min(24, Math.max(1, Math.floor(Number(body.limit ?? 6))));
      const products = await withCache(
        REDIS_KEYS.featured(limit),
        REDIS_TTL.featured,
        async () => {
          const { data, error } = await admin
            .from('products')
            .select(PUBLIC_PRODUCT_SELECT)
            .eq('is_active', true)
            .gt('stock', 0)
            .eq('featured', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true })
            .limit(limit);
          if (error) throw error;
          return data ?? [];
        },
      );

      return jsonResponse({ success: true, products });
    }

    // One round-trip for the guest homepage (categories + featured + shop availability).
    if (action === 'home') {
      const limit = Math.min(24, Math.max(1, Math.floor(Number(body.limit ?? 6))));
      const [categories, products, shopAvailability] = await Promise.all([
        withCache(REDIS_KEYS.categories, REDIS_TTL.categories, async () => {
          const { data, error } = await admin
            .from('categories')
            .select('id, name, slug, image_url, is_active, sort_order, created_at, updated_at')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          if (error) throw error;
          return data ?? [];
        }),
        withCache(REDIS_KEYS.featured(limit), REDIS_TTL.featured, async () => {
          const { data, error } = await admin
            .from('products')
            .select(PUBLIC_PRODUCT_SELECT)
            .eq('is_active', true)
            .gt('stock', 0)
            .eq('featured', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true })
            .limit(limit);
          if (error) throw error;
          return data ?? [];
        }),
        withCache(REDIS_KEYS.shopAvailability, REDIS_TTL.shopAvailability, () =>
          loadShopAvailability(admin)
        ),
      ]);

      return jsonResponse({ success: true, categories, products, shopAvailability });
    }

    if (action === 'products') {
      const page = Math.max(1, Math.floor(Number(body.page ?? 1)));
      const pageLimit = Math.min(24, Math.max(1, Math.floor(Number(body.page_limit ?? 10))));
      const key = REDIS_KEYS.productsPage(fingerprintProducts({ ...body, page, page_limit: pageLimit }));

      const payload = await withCache(
        key,
        REDIS_TTL.productsPage,
        async () => {
          let query = admin
            .from('products')
            .select(PUBLIC_PRODUCT_SELECT, { count: 'exact' })
            .eq('is_active', true)
            .gt('stock', 0)
            .not('slug', 'like', '%-rdp-%');

          const search = body.search?.trim();
          if (search) {
            query = query.or(
              `title.ilike.%${search}%,description.ilike.%${search}%,niche.ilike.%${search}%`,
            );
          }
          if (body.platform) query = query.eq('platform', body.platform);
          if (body.category_id) query = query.eq('category_id', body.category_id);

          switch (body.sort) {
            case 'oldest':
              query = query.order('sort_order', { ascending: false });
              break;
            case 'price_asc':
              query = query.order('price', { ascending: true });
              break;
            case 'price_desc':
              query = query.order('price', { ascending: false });
              break;
            case 'popular':
              query = query.order('followers', { ascending: false, nullsFirst: false });
              break;
            default:
              query = query.order('sort_order', { ascending: true });
          }

          query = query.order('id', { ascending: true });
          const from = (page - 1) * pageLimit;
          query = query.range(from, from + pageLimit - 1);

          const { data, error, count } = await query;
          if (error) throw error;

          return {
            data: data ?? [],
            total: count ?? 0,
            page,
            limit: pageLimit,
            totalPages: Math.ceil((count ?? 0) / pageLimit),
          };
        },
      );

      return jsonResponse({ success: true, ...payload });
    }

    if (action === 'invalidate-listings') {
      // Any signed-in buyer can flush listing caches after a purchase.
      await getAuthenticatedUser(req);
      await invalidatePublicListingCaches();
      return jsonResponse({ success: true, invalidated: true });
    }

    if (action === 'invalidate') {
      const { supabase, user } = await getAuthenticatedUser(req);
      await requireAdmin(supabase, user.id);

      await Promise.all([
        cacheDel(REDIS_KEYS.categories),
        invalidatePublicListingCaches(),
      ]);

      return jsonResponse({ success: true, invalidated: true });
    }

    throw new Error('Unsupported action.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Catalog cache request failed.';
    const status = /auth|admin/i.test(message) ? 401 : 400;
    if (status >= 500 || !/auth|admin|action|method|unsupported/i.test(message)) {
      await captureEdgeException(error, { function: 'public-catalog' });
    }
    return jsonResponse({ error: message }, status);
  }
});
