import { PlatformIcon } from '@/components/common/PlatformIcon';
import { RDP_ICON_PATH, resolveProductIconUrl } from '@/lib/platform-icons';
import { isRdpProduct } from '@/lib/rdp-utils';
import { cn } from '@/lib/utils';
import type { Category, PlatformType, Product, ProductImage } from '@/types';

interface ProductIconProps {
  product: Pick<Product, 'slug' | 'platform'> & {
    category?: Category | null;
    product_images?: ProductImage[];
  };
  size?: 'sm' | 'md';
  className?: string;
}

interface ProductIconBySlugProps {
  slug: string;
  platform: PlatformType;
  category?: Category | null;
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

function StoredProductIcon({
  src,
  alt,
  size = 'md',
  className,
}: {
  src: string;
  alt: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn('shrink-0 object-contain rounded-md', SIZE_CLASSES[size], className)}
    />
  );
}

export function ProductIcon({ product, size = 'md', className }: ProductIconProps) {
  if (isRdpProduct(product)) {
    return <RdpIcon size={size} className={className} />;
  }

  const iconUrl = resolveProductIconUrl(product);
  if (iconUrl) {
    return (
      <StoredProductIcon
        src={iconUrl}
        alt={`${product.category?.name ?? product.platform} icon`}
        size={size}
        className={className}
      />
    );
  }

  return <PlatformIcon platform={product.platform} size={size} className={className} />;
}

export function ProductIconBySlug({
  slug,
  platform,
  category,
  size = 'md',
  className,
}: ProductIconBySlugProps) {
  if (slug.includes('-rdp-')) {
    return <RdpIcon size={size} className={className} />;
  }

  const iconUrl = resolveProductIconUrl({ slug, platform, category });
  if (iconUrl) {
    return (
      <StoredProductIcon
        src={iconUrl}
        alt={`${category?.name ?? platform} icon`}
        size={size}
        className={className}
      />
    );
  }

  return <PlatformIcon platform={platform} size={size} className={className} />;
}
