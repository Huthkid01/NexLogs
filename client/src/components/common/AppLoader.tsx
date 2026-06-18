import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLoaderProps {
  fullScreen?: boolean;
  className?: string;
  iconClassName?: string;
}

export function AppLoader({ fullScreen = false, className, iconClassName }: AppLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'flex items-center justify-center py-16',
        fullScreen && 'min-h-screen',
        className
      )}
    >
      <ShoppingCart
        className={cn('h-10 w-10 text-[#f26522] animate-pulse', iconClassName)}
        strokeWidth={2.25}
      />
    </div>
  );
}
