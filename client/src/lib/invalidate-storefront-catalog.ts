import type { QueryClient } from '@tanstack/react-query';

/**
 * After admin catalog edits (products/categories/featured/sync):
 * refresh browser storefront queries + flush Redis public-catalog keys.
 * Does not touch wallet, SMS, or checkout caches.
 */
export async function invalidateStorefrontCatalog(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['home-catalog'] }),
    queryClient.invalidateQueries({ queryKey: ['home-products'] }),
    queryClient.invalidateQueries({ queryKey: ['featured-products'] }),
    queryClient.invalidateQueries({ queryKey: ['categories'] }),
    queryClient.invalidateQueries({ queryKey: ['product'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  ]);

  const { catalogCacheService } = await import('@/services/catalog-cache.service');
  await catalogCacheService.invalidatePublicCatalog();
}
