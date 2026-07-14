import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PlatformCarousel } from '@/components/home/PlatformCarousel';
import { CategoryDropdown } from '@/components/home/CategoryDropdown';
import { SubscriptionCard } from '@/components/home/SubscriptionCard';
import { ProductListRow } from '@/components/home/ProductListRow';
import { ProductVariantsModal } from '@/components/home/ProductVariantsModal';
import { RequestProductsEmptyState } from '@/components/home/RequestProductsEmptyState';
import { AppLoader } from '@/components/common/AppLoader';
import { findShopCategoryOption } from '@/lib/shop-category-options';
import { SHOP_CATEGORY_LINKS, SHOP_CATEGORY_PLATFORMS, type ShopCategorySlug } from '@/constants/shopCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useSiteVisitTracking } from '@/hooks/useSiteVisitTracking';
import { productService, categoryService } from '@/services';
import { SORT_OPTIONS } from '@/constants';
import { buildShopCategoryOptions } from '@/lib/shop-category-options';
import { isRdpProduct } from '@/lib/rdp-utils';
import type { Product } from '@/types';

export default function HomePage() {
  const { user } = useAuth();
  const { content } = useSiteContent();
  useSiteVisitTracking();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const productSlug = searchParams.get('product');
  const [deepLinkProduct, setDeepLinkProduct] = useState<Product | null>(null);
  const [deepLinkOpen, setDeepLinkOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>(() => {
    const param = searchParams.get('sort');
    return SORT_OPTIONS.some((o) => o.value === param)
      ? (param as (typeof SORT_OPTIONS)[number]['value'])
      : 'newest';
  });
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
  });

  const categoryId = categories?.find((cat) => cat.slug === categorySlug)?.id;

  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productService.getFeatured(6),
    enabled: !!user,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['home-products', categorySlug, categoryId, search, sort, page],
    queryFn: () =>
      productService.getProducts({
        categoryId: categoryId || undefined,
        platform: !categoryId && categorySlug
          ? SHOP_CATEGORY_PLATFORMS[categorySlug as ShopCategorySlug]
          : undefined,
        search: search || undefined,
        sort,
        page,
        limit: 10,
      }),
    enabled: !!user,
  });

  const categoryOptions = buildShopCategoryOptions(categories ?? []);
  const selectedCategory = findShopCategoryOption(categoryOptions, categorySlug);
  const sectionTitle = selectedCategory?.label ?? content.home.catalogTitle;

  const handleCategoryChange = (slug: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const link = SHOP_CATEGORY_LINKS[slug as ShopCategorySlug];
    if (link) {
      navigate(link);
      return;
    }

    setCategorySlug(slug);
    setPage(1);
  };

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.slice(1);
    const element = document.getElementById(id);
    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.hash]);

  useEffect(() => {
    if (!user || !productSlug) {
      setDeepLinkOpen(false);
      setDeepLinkProduct(null);
      return;
    }

    let cancelled = false;
    void productService.getBySlug(productSlug).then((product) => {
      if (cancelled || !product) return;
      if (isRdpProduct(product)) {
        navigate('/purchase-rdp', { replace: true });
        return;
      }
      setDeepLinkProduct(product);
      setDeepLinkOpen(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, productSlug, navigate]);

  const closeDeepLink = () => {
    setDeepLinkOpen(false);
    setDeepLinkProduct(null);
    if (productSlug) {
      const next = new URLSearchParams(searchParams);
      next.delete('product');
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-5">
      <PlatformCarousel />

      {user && (
        <section id="subscriptions">
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 mb-4">{content.home.subscriptionsTitle}</h2>
          {featuredLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-[min(82vw,300px)] shrink-0 rounded-xl sm:w-[300px]" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {featured?.map((product) => (
                <SubscriptionCard key={product.id} product={product} />
              ))}
              <div className="flex w-[min(82vw,300px)] shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center dark:border-dm-input-border dark:bg-dm-surface sm:w-[300px]">
                <div className="w-10 h-10 rounded-full border border-gray-300 dark:border-dm-input-border flex items-center justify-center mb-3">
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">View more</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Browse all subscription products</p>
                <Link to="/marketplace" className="w-full py-2 text-sm font-medium bg-[#1e293b] text-white rounded-md text-center hover:bg-[#0f172a]">
                  See all
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      <div id="quick-actions" className="flex gap-3 justify-center flex-wrap">
        <Link
          to={user ? '/purchase-rdp' : '/login'}
          className="btn-orange px-7 sm:px-8 py-2.5 text-sm text-center min-w-[130px] sm:min-w-[150px]"
        >
          {content.home.purchaseRdpLabel}
        </Link>
        <Link
          to={user ? '/buy-numbers' : '/login'}
          className="btn-green px-7 sm:px-8 py-2.5 text-sm text-center min-w-[130px] sm:min-w-[150px]"
        >
          {content.home.buyNumbersLabel}
        </Link>
      </div>

      <div id="categories">
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1.5">{content.home.categoriesLabel}</p>
        <CategoryDropdown value={categorySlug} onChange={handleCategoryChange} />
      </div>

      <div id="catalog">
        <h2 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 mb-6">{sectionTitle}</h2>

        {!user ? (
          <div className="flex justify-center pb-20">
            <Link to="/login" className="btn-orange px-7 py-2.5 text-sm">
              {content.home.loginPromptLabel}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{content.home.latestProductsLabel}</h3>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as (typeof SORT_OPTIONS)[number]['value']);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-gray-300 dark:border-dm-input-border bg-white dark:bg-dm-surface px-3 text-sm text-gray-600 dark:text-gray-300 w-full sm:w-auto sm:min-w-[140px]"
              >
                <option value="newest">Default</option>
                {SORT_OPTIONS.filter((o) => o.value !== 'newest').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-dm-input-border bg-white dark:bg-dm-surface px-3 text-sm text-gray-600 dark:text-gray-300 mb-2 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600"
            />

            {isLoading ? (
              <div className="py-10">
                <AppLoader iconClassName="h-9 w-9" />
              </div>
            ) : !products?.data?.length ? (
              <RequestProductsEmptyState
                categoryLabel={selectedCategory?.label}
                searchQuery={search}
              />
            ) : (
              <div>
                {(products?.data ?? []).map((product) => (
                  <ProductListRow key={product.id} product={product} />
                ))}
              </div>
            )}

            {products && products.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-dm-input"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {products.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= products.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-dm-input"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {deepLinkProduct && (
        <ProductVariantsModal
          product={deepLinkProduct}
          open={deepLinkOpen}
          onClose={closeDeepLink}
        />
      )}
    </div>
  );
}
