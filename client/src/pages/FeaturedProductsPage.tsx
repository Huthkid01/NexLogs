import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ProductListRow } from '@/components/home/ProductListRow';
import { RequestProductsEmptyState } from '@/components/home/RequestProductsEmptyState';
import { AppLoader } from '@/components/common/AppLoader';
import { SeoHead } from '@/components/seo/SeoHead';
import { SORT_OPTIONS } from '@/constants';
import { catalogQueryOptions } from '@/lib/query-cache';
import { SEO_SITE_URL } from '@/lib/seo';
import { productService } from '@/services';
import type { Product } from '@/types';

const PAGE_SIZE = 10;

function sortFeatured(products: Product[], sort: (typeof SORT_OPTIONS)[number]['value']) {
  const list = [...products];
  switch (sort) {
    case 'oldest':
      return list.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    case 'price_asc':
      return list.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
    case 'price_desc':
      return list.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
    case 'popular':
      return list.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0) || a.id.localeCompare(b.id));
    case 'newest':
    default:
      return list.sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0)
          || b.created_at.localeCompare(a.created_at)
          || a.id.localeCompare(b.id),
      );
  }
}

export default function FeaturedProductsPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('newest');
  const [page, setPage] = useState(1);

  const { data: featured = [], isLoading } = useQuery({
    queryKey: ['featured-products-all'],
    queryFn: () => productService.getAllFeatured(),
    ...catalogQueryOptions,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = !query
      ? featured
      : featured.filter((product) =>
          product.title.toLowerCase().includes(query)
          || product.slug.toLowerCase().includes(query)
          || product.platform.toLowerCase().includes(query),
        );
    return sortFeatured(matched, sort);
  }, [featured, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-5">
      <SeoHead
        title="Featured Products — Nexlogs Marketplace"
        description="Browse all featured products on Nexlogs. Search, sort, and purchase with wallet checkout."
        path="/featured"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Featured Products',
          url: `${SEO_SITE_URL}/featured`,
          isPartOf: { '@id': `${SEO_SITE_URL}/#website` },
        }}
      />

      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#f26522] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100 sm:text-3xl">
        Featured Products
      </h1>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            All featured ({filtered.length})
          </h2>
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
          placeholder="Search featured products..."
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
        ) : !pageItems.length ? (
          <RequestProductsEmptyState
            categoryLabel="Featured"
            searchQuery={search}
          />
        ) : (
          <div>
            {pageItems.map((product) => (
              <ProductListRow key={product.id} product={product} />
            ))}
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 pt-8">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-dm-input-border dark:bg-dm-surface dark:text-gray-300 dark:hover:bg-dm-input"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
