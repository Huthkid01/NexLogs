import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PlatformLogo } from '@/components/common/platform-logos';
import { SHOP_CATEGORIES, SHOP_CATEGORY_ICON_PATHS, SHOP_CATEGORY_PLATFORMS, type ShopCategorySlug } from '@/constants/shopCategories';
import { cn } from '@/lib/utils';

interface CategoryDropdownProps {
  value: string;
  onChange: (slug: string) => void;
}

export function CategoryDropdown({ value, onChange }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = SHOP_CATEGORIES.find((option) => option.slug === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderIcon = (slug: ShopCategorySlug) => {
    const customIcon = SHOP_CATEGORY_ICON_PATHS[slug];
    if (customIcon) {
      return <img src={customIcon} alt="" className="h-5 w-5 shrink-0 object-contain" />;
    }

    const platform = SHOP_CATEGORY_PLATFORMS[slug];
    if (!platform) return null;

    return <PlatformLogo platform={platform} className="h-5 w-5" />;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 bg-white dark:bg-dm-surface rounded-md px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-dm-input-border focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-dm-input-border',
          open && 'border-gray-300 dark:border-dm-input-border'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              {renderIcon(selected.slug)}
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
          className="absolute z-30 mt-1 w-full bg-white dark:bg-dm-surface border border-gray-200 dark:border-dm-border rounded-md shadow-lg py-1"
          role="listbox"
        >
          {SHOP_CATEGORIES.map((option) => (
            <li key={option.slug} role="option" aria-selected={value === option.slug}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.slug);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dm-input',
                  value === option.slug && 'bg-gray-50 dark:bg-dm-input'
                )}
              >
                {renderIcon(option.slug)}
                <span className="font-medium tracking-wide">{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
