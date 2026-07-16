import type { ReactNode } from 'react';

export type SlideBannerVariant = 'live' | 'mobile-preview' | 'desktop-preview';

interface SlideBannerProps {
  src: string;
  alt?: string;
  variant?: SlideBannerVariant;
  children?: ReactNode;
  className?: string;
  priority?: boolean;
  /** Prefer left text / CTA for designed banners (default). */
  imagePosition?: 'left' | 'center';
}

const variantClass: Record<SlideBannerVariant, string> = {
  // Match AffordableLogs ImageSlider: h-40 mobile, md:h-64 desktop.
  live: 'h-40 w-full md:h-64',
  'mobile-preview': 'h-40 w-full',
  'desktop-preview': 'h-64 w-full',
};

const imagePositionClass = {
  left: 'object-[left_center]',
  center: 'object-center',
} as const;

export function SlideBanner({
  src,
  alt = 'Homepage banner slide',
  variant = 'live',
  children,
  className = '',
  priority = false,
  imagePosition = 'left',
}: SlideBannerProps) {
  const position = imagePositionClass[imagePosition];

  const imageClass: Record<SlideBannerVariant, string> = {
    live: `absolute inset-0 h-full w-full object-cover ${position} lg:object-center`,
    'mobile-preview': `absolute inset-0 h-full w-full object-cover ${position}`,
    'desktop-preview': `absolute inset-0 h-full w-full object-cover object-center`,
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black/5 ${variantClass[variant]} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className={imageClass[variant]}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
      />
      {children}
    </div>
  );
}
