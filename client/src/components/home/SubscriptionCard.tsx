import { Link } from 'react-router-dom';
import { PlatformIcon } from '@/components/common/PlatformIcon';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import type { Product } from '@/types';

interface SubscriptionCardProps {
  product: Product;
}

export function SubscriptionCard({ product }: SubscriptionCardProps) {
  const { formatProductPrice } = useFormatDisplayPrice();

  return (
    <div className="flex w-[min(82vw,300px)] shrink-0 snap-start flex-col rounded-xl border border-gray-200 bg-white p-4 transition-colors dark:border-dm-border dark:bg-dm-surface dark:hover:bg-dm-product-row-hover sm:w-[300px]">
      <div className="flex items-start gap-3">
        <PlatformIcon platform={product.platform} size="sm" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-snug break-words text-gray-900 dark:text-gray-100 sm:line-clamp-3">
            {product.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed break-words text-gray-500 dark:text-gray-400 sm:line-clamp-4">
            {product.description}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-[#1b5e20]">{formatProductPrice(product.price)}</p>
      <Link to="/marketplace" className="btn-orange mt-3 w-full py-2 text-center text-sm">
        Purchase
      </Link>
    </div>
  );
}
