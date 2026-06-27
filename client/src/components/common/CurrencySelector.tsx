import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import type { DisplayCurrency } from '@/contexts/display-currency';

interface CurrencySelectorProps {
  className?: string;
  compact?: boolean;
}

const OPTIONS: Array<{ code: DisplayCurrency; label: string }> = [
  { code: 'NGN', label: 'NGN (₦)' },
  { code: 'USD', label: 'USD ($)' },
];

export function CurrencySelector({ className, compact = false }: CurrencySelectorProps) {
  const { currency, setCurrency } = useDisplayCurrency();

  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as DisplayCurrency)}
        aria-label="Product and wallet currency"
        className={cn(
          'appearance-none rounded-lg border border-gray-200 dark:border-dm-border bg-white dark:bg-dm-surface',
          'text-xs font-semibold text-gray-700 dark:text-gray-200',
          'focus:outline-none focus:ring-2 focus:ring-[#f26522]/40 focus:border-[#f26522]',
          compact ? 'pl-2.5 pr-7 py-1.5 min-w-[88px]' : 'pl-3 pr-8 py-2 min-w-[108px]',
        )}
      >
        {OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {compact ? option.code : option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
        aria-hidden
      />
    </div>
  );
}
