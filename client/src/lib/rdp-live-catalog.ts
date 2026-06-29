import { getRdpProductSlug, type RdpCatalog, type RdpDuration, type RdpPlan } from '@/lib/rdp-catalog';
import { isRdpProductSlug } from '@/lib/rdp-utils';

export type RdpProductSnapshot = {
  slug: string;
  price: number;
  title: string;
  is_active: boolean;
};

export function findRdpPlanForProductSlug(catalog: RdpCatalog, productSlug: string): RdpPlan | null {
  for (const duration of catalog.durations) {
    const plan = catalog.plans.find((entry) => getRdpProductSlug(entry, duration) === productSlug);
    if (plan) return plan;
  }
  return null;
}

export function planHasActiveProduct(
  plan: RdpPlan,
  products: RdpProductSnapshot[],
  durations: RdpDuration[],
): boolean {
  return durations.some((duration) => {
    const slug = getRdpProductSlug(plan, duration);
    const product = products.find((entry) => entry.slug === slug);
    return Boolean(product?.is_active);
  });
}

/** Show only plans that exist as active products for the selected duration; prices come from products. */
export function buildLiveRdpCatalog(
  catalog: RdpCatalog,
  products: RdpProductSnapshot[],
  duration: RdpDuration,
): RdpCatalog {
  const activeBySlug = new Map(
    products.filter((product) => product.is_active).map((product) => [product.slug, product]),
  );

  const plans = catalog.plans
    .map((plan) => {
      const slug = getRdpProductSlug(plan, duration);
      const product = activeBySlug.get(slug);
      if (!product) return null;

      const priceNgn = Number(product.price);
      const priceUsdMonthly =
        duration.months > 0 ? Math.round(priceNgn / duration.months) : priceNgn;

      return {
        ...plan,
        priceUsdMonthly,
      };
    })
    .filter((plan): plan is RdpPlan => plan !== null);

  const locationIds = new Set(plans.map((plan) => plan.locationId));

  return {
    ...catalog,
    locations: catalog.locations.filter((location) => locationIds.has(location.id)),
    plans,
  };
}

export function applyRdpProductToCatalog(
  catalog: RdpCatalog,
  product: RdpProductSnapshot,
): RdpCatalog {
  if (!isRdpProductSlug(product.slug)) return catalog;

  const plan = findRdpPlanForProductSlug(catalog, product.slug);
  if (!plan) return catalog;

  const oneMonth = catalog.durations.find((duration) => duration.months === 1) ?? catalog.durations[0];
  const isOneMonthProduct = oneMonth && getRdpProductSlug(plan, oneMonth) === product.slug;

  return {
    ...catalog,
    plans: catalog.plans.map((entry) => {
      if (entry.id !== plan.id) return entry;
      return {
        ...entry,
        priceUsdMonthly: isOneMonthProduct ? Number(product.price) : entry.priceUsdMonthly,
      };
    }),
  };
}

export function removeRdpProductFromCatalog(
  catalog: RdpCatalog,
  productSlug: string,
  remainingProducts: RdpProductSnapshot[],
): RdpCatalog {
  if (!isRdpProductSlug(productSlug)) return catalog;

  const plan = findRdpPlanForProductSlug(catalog, productSlug);
  if (!plan) return catalog;

  if (planHasActiveProduct(plan, remainingProducts, catalog.durations)) {
    return catalog;
  }

  return {
    ...catalog,
    plans: catalog.plans.filter((entry) => entry.id !== plan.id),
  };
}
