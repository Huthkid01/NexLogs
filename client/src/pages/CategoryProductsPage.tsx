import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CategoryDropdown } from '@/components/home/CategoryDropdown';
import { ProductListRow } from '@/components/home/ProductListRow';
import { RequestProductsEmptyState } from '@/components/home/RequestProductsEmptyState';
import { AppLoader } from '@/components/common/AppLoader';
import { SeoHead } from '@/components/seo/SeoHead';
import { SORT_OPTIONS } from '@/constants';
import {
  SHOP_CATEGORIES,
  SHOP_CATEGORY_LINKS,
  SHOP_CATEGORY_PLATFORMS,
  type ShopCategorySlug,
} from '@/constants/shopCategories';
import { catalogQueryOptions } from '@/lib/query-cache';
import { buildShopCategoryOptions, findShopCategoryOption } from '@/lib/shop-category-options';
import { SEO_SITE_URL } from '@/lib/seo';
import { productService } from '@/services';
import type { Category } from '@/types';

const STATIC_SHOP_SLUGS = new Set<string>(SHOP_CATEGORIES.map((category) => category.slug));

export default function CategoryProductsPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('newest');
  const [page, setPage] = useState(1);

  const { data: homeCatalog } = useQuery({
    queryKey: ['home-catalog'],
    queryFn: async () => {
      const { catalogCacheService } = await import('@/services/catalog-cache.service');
      const boot = await catalogCacheService.getHome(6);
      if (!boot) {
        return {
          categories: [] as Category[],
          products: [],
          shopAvailability: { platforms: [], categorySlugs: [] },
        };
      }
      queryClient.setQueryData(['categories'], boot.categories);
      queryClient.setQueryData(['featured-products'], boot.products);
      return boot;
    },
    ...catalogQueryOptions,
  });

  const categories = (homeCatalog?.categories as Category[] | undefined) ?? [];
  const shopAvailability = homeCatalog?.shopAvailability;
  const categoryOptions = buildShopCategoryOptions(categories, shopAvailability);
  const selectedCategory = findShopCategoryOption(categoryOptions, slug);
  const categoryId = categories.find((cat) => cat.slug === slug)?.id;
  const categoryLabel = selectedCategory?.label ?? slug.toUpperCase();

  useEffect(() => {
    if (!slug) {
      navigate('/marketplace', { replace: true });
      return;
    }

    const link = SHOP_CATEGORY_LINKS[slug as ShopCategorySlug];
    if (link) {
      navigate(link, { replace: true });
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (!slug || !shopAvailability || SHOP_CATEGORY_LINKS[slug as ShopCategorySlug]) return;
    if (!STATIC_SHOP_SLUGS.has(slug) && !categories.some((cat) => cat.slug === slug)) return;
    if (selectedCategory) return;
    navigate('/marketplace', { replace: true });
  }, [slug, shopAvailability, selectedCategory, categories, navigate]);

  useEffect(() => {
    setSearch('');
    setSort('newest');
    setPage(1);
  }, [slug]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['category-products', slug, categoryId, search, sort, page],
    queryFn: () =>
      productService.getProducts({
        categoryId: categoryId || undefined,
        platform: !categoryId && slug
          ? SHOP_CATEGORY_PLATFORMS[slug as ShopCategorySlug]
          : undefined,
        search: search || undefined,
        sort,
        page,
        limit: 10,
      }),
    enabled: !!slug && !SHOP_CATEGORY_LINKS[slug as ShopCategorySlug],
    ...catalogQueryOptions,
  });

  const handleCategoryChange = (nextSlug: string) => {
    const link = SHOP_CATEGORY_LINKS[nextSlug as ShopCategorySlug];
    if (link) {
      navigate(link);
      return;
    }
    if (!nextSlug) {
      navigate('/marketplace');
      return;
    }
    navigate(`/marketplace/${nextSlug}`);
  };

  if (!slug || SHOP_CATEGORY_LINKS[slug as ShopCategorySlug]) {
    return (
      <div className="py-16">
        <AppLoader iconClassName="h-9 w-9" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-5">
      <SeoHead
        title={`${categoryLabel} — Nexlogs Marketplace`}
        description={`Browse ${categoryLabel} products on Nexlogs. Search, sort, and purchase with wallet checkout.`}
        path={`/marketplace/${slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: categoryLabel,
          url: `${SEO_SITE_URL}/marketplace/${slug}`,
          isPartOf: { '@id': `${SEO_SITE_URL}/#website` },
        }}
      />

      <div>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#f26522] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to All Categories
        </Link>
      </div>

      <div>
        <CategoryDropdown
          value={slug}
          onChange={handleCategoryChange}
          categories={categories}
          categoriesManaged
          shopAvailability={shopAvailability ?? { platforms: [], categorySlugs: [] }}
        />
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100 sm:text-3xl">
        {categoryLabel}
      </h1>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Category Products</h2>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as (typeof SORT_OPTIONS)[number]['value']);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-600 dark:border-dm-input-border dark:bg-dm-surface dark:text-gray-300 sm:w-auto sm:min-w-[140px]"
          >
            <option value="newest">Default</option>
            {SORT_OPTIONS.filter((o) => o.value !== 'newest').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
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
          className="mb-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-600 focus:border-gray-300 focus:outline-none focus:ring-0 dark:border-dm-input-border dark:bg-dm-surface dark:text-gray-300 dark:focus:border-gray-600"
        />

        {isLoading ? (
          <div className="py-10">
            <AppLoader iconClassName="h-9 w-9" />
          </div>
        ) : !products?.data?.length ? (
          <RequestProductsEmptyState
            categoryLabel={categoryLabel}
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
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-dm-input-border dark:bg-dm-surface dark:text-gray-300 dark:hover:bg-dm-input"
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
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-dm-input-border dark:bg-dm-surface dark:text-gray-300 dark:hover:bg-dm-input"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
