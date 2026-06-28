import { ChevronDown, Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface BroadcastInlineProductSelectorProps {
  open: boolean;
  onToggleOpen: () => void;
  products: Product[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
  onSelectRecent: () => void;
  loading?: boolean;
}

export function BroadcastInlineProductSelector({
  open,
  onToggleOpen,
  products,
  selectedIds,
  onToggle,
  onSelectRecent,
  loading = false,
}: BroadcastInlineProductSelectorProps) {
  const [query, setQuery] = useState('');

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.includes(product.id)),
    [products, selectedIds],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(normalized) ||
        product.slug.toLowerCase().includes(normalized),
    );
  }, [products, query]);

  return (
    <>
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
        <span className="w-14 shrink-0 pt-1.5 text-sm text-slate-500">Products</span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {selectedProducts.length === 0 ? (
              <span className="text-sm text-slate-400">No products selected yet</span>
            ) : (
              selectedProducts.map((product) => (
                <span
                  key={product.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-200"
                >
                  <span className="truncate">{product.title}</span>
                </span>
              ))
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-950/30"
              onClick={onToggleOpen}
            >
              <Package className="mr-1.5 h-3.5 w-3.5" />
              {open ? 'Hide list' : 'Select products'}
              <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            </Button>
          </div>
          {selectedIds.length > 0 && (
            <p className="text-xs text-slate-500">
              {selectedIds.length} product{selectedIds.length === 1 ? '' : 's'} — names and links are added to the email automatically.
            </p>
          )}
        </div>
      </div>

      {open && (
        <div className="border-b border-slate-100 dark:border-[#18263b]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-[#18263b]">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#06101d]">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <Button type="button" size="sm" variant="ghost" className="shrink-0 text-violet-600" onClick={onSelectRecent}>
              Select 5 recent
            </Button>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No active products found.</p>
            ) : (
              filtered.map((product) => {
                const checked = selectedIds.includes(product.id);
                return (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-start gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50 dark:border-[#18263b] dark:hover:bg-[#06101d]"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#7c3aed]"
                      checked={checked}
                      onChange={() => onToggle(product.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{product.title}</span>
                      <span className="block text-xs text-slate-500">
                        {formatPrice(product.price)} • stock {product.stock}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
