import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRating({ value, onChange, size = 'md', className }: StarRatingProps) {
  const interactive = typeof onChange === 'function';
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('inline-flex items-center gap-1', className)} role={interactive ? 'radiogroup' : undefined}>
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={filled}
              aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
              onClick={() => onChange(starValue)}
              className="rounded p-0.5 text-[#f26522] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f26522]/40"
            >
              <Star className={cn(iconClass, filled ? 'fill-current' : 'fill-none')} />
            </button>
          );
        }

        return (
          <Star
            key={starValue}
            className={cn(iconClass, filled ? 'fill-[#f26522] text-[#f26522]' : 'fill-none text-gray-300 dark:text-gray-600')}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export function formatReviewRatingLabel(rating: number): string {
  if (rating >= 5) return 'Excellent';
  if (rating >= 4) return 'Good';
  if (rating >= 3) return 'Average';
  if (rating >= 2) return 'Fair';
  return 'Poor';
}
