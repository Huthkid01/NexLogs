import { Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface BroadcastProductPickerProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
  onSelectRecent: () => void;
  loading?: boolean;
  anchorClassName?: string;
}

export function BroadcastProductPicker({
  open,
  onClose,
  products,
  selectedIds,
  onToggle,
  onSelectRecent,
  loading = false,
  anchorClassName,
}: BroadcastProductPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(normalized) ||
        product.slug.toLowerCase().includes(normalized),
    );
  }, [products, query]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-40" onClick={onClose} aria-label="Close product picker" />
      <div
        className={cn(
          'absolute z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#22324a] dark:bg-[#0b1628]',
          anchorClassName,
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-[#18263b]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-[#f26522]" />
            Products to include
          </div>
          <button
            type="button"
            onClick={onSelectRecent}
            className="text-xs font-medium text-[#f26522] hover:underline"
          >
            Select 5 recent
          </button>
        </div>

        <div className="border-b border-slate-100 px-3 py-2 dark:border-[#18263b]">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#06101d]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading products...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No products found.</p>
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
                    className="mt-1 accent-primary"
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

        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-[#18263b]">
          {selectedIds.length} product{selectedIds.length === 1 ? '' : 's'} selected — links are added automatically in the email.
        </div>
      </div>
    </>
  );
}
