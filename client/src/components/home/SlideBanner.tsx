import type { ReactNode } from 'react';
import { SLIDE_BANNER_ASPECT } from '@/lib/slide-banner';

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
  // ~2.4:1 — fits designed promo banners on phone + desktop without crushing CTAs
  live: 'aspect-[12/5] w-full max-h-[200px] sm:max-h-[260px] md:max-h-[320px] lg:max-h-[400px]',
  'mobile-preview': 'aspect-[12/5] w-full',
  'desktop-preview': 'w-full',
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
  const aspectStyle = variant === 'desktop-preview' ? { aspectRatio: SLIDE_BANNER_ASPECT } : undefined;
  const position = imagePositionClass[imagePosition];

  const imageClass: Record<SlideBannerVariant, string> = {
    live: `absolute inset-0 h-full w-full object-cover ${position} lg:object-center`,
    'mobile-preview': `absolute inset-0 h-full w-full object-cover ${position}`,
    'desktop-preview': `absolute inset-0 h-full w-full object-cover object-center`,
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black/5 ${variantClass[variant]} ${className}`}
      style={aspectStyle}
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
