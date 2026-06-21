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
    <div className="shrink-0 w-[220px] sm:w-[240px] border border-gray-200 dark:border-dm-border rounded-lg bg-white dark:bg-dm-surface dark:hover:bg-dm-product-row-hover p-4 flex flex-col transition-colors">
      <PlatformIcon platform={product.platform} className="mb-3" />
      <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 uppercase leading-snug line-clamp-2 min-h-[2.5rem]">
        {product.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3 flex-1 leading-relaxed">
        {product.description}
      </p>
      <p className="text-[#1b5e20] font-semibold text-sm mt-3">{formatProductPrice(product.price)}</p>
      <Link
        to="/marketplace"
        className="btn-orange mt-3 w-full py-2 text-sm text-center"
      >
        Purchase
      </Link>
    </div>
  );
}
