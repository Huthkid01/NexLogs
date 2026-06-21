import { cn } from '@/lib/utils';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import type { DisplayCurrency } from '@/contexts/display-currency';

interface CurrencySelectorProps {
  className?: string;
  compact?: boolean;
}

export function CurrencySelector({ className, compact = false }: CurrencySelectorProps) {
  const { currency, setCurrency } = useDisplayCurrency();

  const options: Array<{ code: DisplayCurrency; label: string }> = [
    { code: 'USD', label: 'USD' },
    { code: 'NGN', label: 'NGN' },
  ];

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-gray-200 dark:border-dm-border bg-white dark:bg-dm-surface p-0.5',
        className,
      )}
      role="group"
      aria-label="Display currency"
    >
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setCurrency(option.code)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
            compact ? 'min-w-[42px]' : 'min-w-[48px]',
            currency === option.code
              ? 'bg-[#f26522] text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dm-input',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
