import { PlatformIcon } from '@/components/common/PlatformIcon';
import { RDP_ICON_PATH } from '@/lib/platform-icons';
import { isRdpProduct } from '@/lib/rdp-utils';
import { cn } from '@/lib/utils';
import type { PlatformType, Product } from '@/types';

interface ProductIconProps {
  product: Pick<Product, 'slug' | 'platform'>;
  size?: 'sm' | 'md';
  className?: string;
}

interface ProductIconBySlugProps {
  slug: string;
  platform: PlatformType;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
} as const;

function RdpIcon({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <img
      src={RDP_ICON_PATH}
      alt="RDP"
      className={cn('shrink-0 object-contain', SIZE_CLASSES[size], className)}
    />
  );
}

export function ProductIcon({ product, size = 'md', className }: ProductIconProps) {
  if (isRdpProduct(product)) {
    return <RdpIcon size={size} className={className} />;
  }

  return <PlatformIcon platform={product.platform} size={size} className={className} />;
}

export function ProductIconBySlug({ slug, platform, size = 'md', className }: ProductIconBySlugProps) {
  if (slug.includes('-rdp-')) {
    return <RdpIcon size={size} className={className} />;
  }

  return <PlatformIcon platform={platform} size={size} className={className} />;
}
