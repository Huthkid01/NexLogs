import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { PlatformLogo } from '@/components/common/platform-logos';
import { buildShopCategoryOptions, type ShopCategoryOption } from '@/lib/shop-category-options';
import type { ShopAvailability } from '@/lib/shop-availability';
import { catalogQueryOptions } from '@/lib/query-cache';
import { categoryService } from '@/services';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryDropdownProps {
  value: string;
  onChange: (slug: string) => void;
  /** When provided (e.g. from home-catalog bootstrap), use these instead of fetching. */
  categories?: Category[];
  /** Parent owns categories (home bootstrap) — never fire a parallel categories request. */
  categoriesManaged?: boolean;
  /** Hide shop categories that currently have no in-stock products (own + Loggsplug). */
  shopAvailability?: ShopAvailability | null;
}

function CategoryInitials({ label }: { label: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold uppercase text-gray-500 dark:bg-dm-input dark:text-gray-300">
      {label.slice(0, 2)}
    </span>
  );
}

function CategoryOptionIcon({ option }: { option: ShopCategoryOption }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (option.imageUrl && !imageFailed) {
    return (
      <img
        src={option.imageUrl}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        decoding="async"
        className="h-5 w-5 shrink-0 rounded object-contain"
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (option.platform) {
    return <PlatformLogo platform={option.platform} className="h-5 w-5" />;
  }

  return <CategoryInitials label={option.label} />;
}

export function CategoryDropdown({
  value,
  onChange,
  categories: categoriesProp,
  categoriesManaged = false,
  shopAvailability = null,
}: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: fetchedCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
    ...catalogQueryOptions,
    enabled: !categoriesManaged,
  });

  const categories = categoriesManaged ? (categoriesProp ?? []) : (categoriesProp ?? fetchedCategories);
  const options = useMemo(
    () => buildShopCategoryOptions(categories, shopAvailability),
    [categories, shopAvailability],
  );
  const selected = options.find((option) => option.slug === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 bg-white dark:bg-dm-surface rounded-md px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-dm-input-border focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-dm-input-border',
          open && 'border-gray-300 dark:border-dm-input-border',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              <CategoryOptionIcon option={selected} />
              <span className="truncate font-medium tracking-wide">{selected.label}</span>
            </>
          ) : (
            <span>Select a category</span>
          )}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto bg-white dark:bg-dm-surface border border-gray-200 dark:border-dm-border rounded-md shadow-lg py-1"
          role="listbox"
        >
          {options.map((option) => (
            <li key={option.slug} role="option" aria-selected={value === option.slug}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.slug);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dm-input',
                  value === option.slug && 'bg-gray-50 dark:bg-dm-input',
                )}
              >
                <CategoryOptionIcon option={option} />
                <span className="font-medium tracking-wide">{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
