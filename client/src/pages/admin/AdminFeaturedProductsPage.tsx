import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Star, X } from 'lucide-react';
import { SubscriptionCard } from '@/components/home/SubscriptionCard';
import { ProductIcon } from '@/components/common/ProductIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useTheme } from '@/hooks/useTheme';
import {
  adminInputClass,
  adminMainCardClass,
  adminModalClass,
  adminModalOverlayClass,
  adminMutedTextClass,
  adminOutlineButtonClass,
  adminPageClass,
  adminStrongTextClass,
  adminSubtleTextClass,
} from '@/lib/admin-theme';
import { cn } from '@/lib/utils';
import { productService } from '@/services';
import { toast } from 'sonner';
import type { Product } from '@/types';

const SITE_FEATURED_LIMIT = 6;

function invalidateFeaturedCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  void queryClient.invalidateQueries({ queryKey: ['featured-products'] });
  void queryClient.invalidateQueries({ queryKey: ['home-catalog'] });
  void queryClient.invalidateQueries({ queryKey: ['home-products'] });
  void import('@/services/catalog-cache.service').then(({ catalogCacheService }) =>
    catalogCacheService.invalidatePublicCatalog(),
  );
}

function visibleOnSite(product: Product) {
  return Boolean(product.featured && product.is_active && product.stock > 0);
}

export default function AdminFeaturedProductsPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content } = useSiteContent();
  const { formatProductPrice } = useFormatDisplayPrice();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productService.getAllAdmin(),
  });

  const featuredProducts = useMemo(
    () =>
      [...products]
        .filter((product) => product.featured)
        .sort((a, b) => {
          const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (sortDiff !== 0) return sortDiff;
          return a.id.localeCompare(b.id);
        }),
    [products],
  );

  const sitePreview = useMemo(
    () => featuredProducts.filter(visibleOnSite).slice(0, SITE_FEATURED_LIMIT),
    [featuredProducts],
  );

  const addableProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => !product.featured)
      .filter((product) => {
        if (!query) return true;
        return (
          product.title.toLowerCase().includes(query)
          || product.slug.toLowerCase().includes(query)
          || product.platform.toLowerCase().includes(query)
          || (product.category?.name?.toLowerCase().includes(query) ?? false)
        );
      });
  }, [products, search]);

  const setFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      productService.update(id, { featured }),
    onSuccess: (_saved, variables) => {
      invalidateFeaturedCaches(queryClient);
      toast.success(variables.featured ? 'Added to featured' : 'Removed from featured');
      if (variables.featured) {
        setAddOpen(false);
        setSearch('');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not update featured products');
    },
  });

  return (
    <div className={adminPageClass(isDark)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={cn('text-2xl font-bold', adminStrongTextClass(isDark))}>Featured Products</h1>
          <p className={cn('mt-1 text-sm', adminSubtleTextClass(isDark))}>
            Manage the homepage featured strip. Same cards customers see under “{content.home.subscriptionsTitle}”.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="bg-[#f26522] hover:bg-[#d94e0f]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add featured product
        </Button>
      </div>

      <Card className={adminMainCardClass(isDark)}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-[#f26522]" />
            <h2 className={cn('text-[15px] font-bold', adminStrongTextClass(isDark))}>
              Site preview
            </h2>
          </div>
          <p className={cn('text-sm', adminMutedTextClass(isDark))}>
            Shows up to {SITE_FEATURED_LIMIT} active, in-stock featured products — matching the live homepage.
          </p>

          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-[min(82vw,300px)] shrink-0 rounded-xl sm:w-[300px]" />
              ))}
            </div>
          ) : sitePreview.length === 0 ? (
            <div className={cn('rounded-xl border border-dashed px-4 py-10 text-center text-sm', isDark ? 'border-[#22324a] text-slate-400' : 'border-slate-200 text-slate-500')}>
              No featured products are visible on the site yet. Add an active product with stock.
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {sitePreview.map((product, index) => (
                <SubscriptionCard
                  key={product.id}
                  product={product}
                  priority={index < 2}
                  interactive={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={adminMainCardClass(isDark)}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className={cn('text-[15px] font-bold', adminStrongTextClass(isDark))}>
                All featured ({featuredProducts.length})
              </h2>
              <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
                Remove any product from the featured list. Hidden/out-of-stock items stay here until you remove them.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className={cn('rounded-xl border border-dashed px-4 py-10 text-center text-sm', isDark ? 'border-[#22324a] text-slate-400' : 'border-slate-200 text-slate-500')}>
              No products marked featured yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {featuredProducts.map((product) => {
                const onSite = visibleOnSite(product);
                return (
                  <li
                    key={product.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
                      isDark ? 'border-[#22324a] bg-[#081321]' : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <ProductIcon product={product} size="sm" className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm font-semibold', adminStrongTextClass(isDark))}>
                          {product.title}
                        </p>
                        <p className={cn('mt-0.5 text-xs', adminMutedTextClass(isDark))}>
                          {product.slug} · {formatProductPrice(product.price)}
                          {!onSite ? ' · not shown on site' : ''}
                          {!product.is_active ? ' (inactive)' : ''}
                          {product.stock <= 0 ? ' (out of stock)' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={adminOutlineButtonClass(isDark)}
                      disabled={setFeatured.isPending}
                      onClick={() => setFeatured.mutate({ id: product.id, featured: false })}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {addOpen ? (
        <div className={adminModalOverlayClass(isDark)} onClick={() => setAddOpen(false)}>
          <div
            className={cn(adminModalClass(isDark), 'max-w-xl')}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className={cn('text-lg font-bold', adminStrongTextClass(isDark))}>
                  Add featured product
                </h2>
                <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
                  Pick a product to show in the homepage featured strip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className={cn('rounded-lg p-2', isDark ? 'hover:bg-[#122033]' : 'hover:bg-slate-100')}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', isDark ? 'text-slate-500' : 'text-slate-400')} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products…"
                className={cn(adminInputClass(isDark), 'pl-9')}
              />
            </div>
            <p className={cn('mb-3 text-xs', adminMutedTextClass(isDark))}>
              Showing {addableProducts.length} product{addableProducts.length === 1 ? '' : 's'}
              {search.trim() ? ' matching your search' : ''}.
            </p>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {addableProducts.length === 0 ? (
                <p className={cn('py-8 text-center text-sm', adminMutedTextClass(isDark))}>
                  No matching products to add.
                </p>
              ) : (
                addableProducts.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5',
                      isDark ? 'border-[#22324a]' : 'border-slate-200',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ProductIcon product={product} size="sm" className="shrink-0" />
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm font-medium', adminStrongTextClass(isDark))}>
                          {product.title}
                        </p>
                        <p className={cn('truncate text-xs', adminMutedTextClass(isDark))}>
                          {product.slug}
                          {!product.is_active || product.stock <= 0
                            ? ' · won’t show on site until active with stock'
                            : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 bg-[#f26522] hover:bg-[#d94e0f]"
                      disabled={setFeatured.isPending}
                      onClick={() => setFeatured.mutate({ id: product.id, featured: true })}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
