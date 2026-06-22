import type { ReactNode } from 'react';
import { SLIDE_BANNER_ASPECT } from '@/lib/slide-banner';

export type SlideBannerVariant = 'live' | 'mobile-preview' | 'desktop-preview';

interface SlideBannerProps {
  src: string;
  alt?: string;
  variant?: SlideBannerVariant;
  children?: ReactNode;
  className?: string;
}

const variantClass: Record<SlideBannerVariant, string> = {
  live: 'h-[165px] w-full sm:h-[190px] lg:aspect-[1920/400] lg:h-auto',
  'mobile-preview': 'h-[165px] w-full',
  'desktop-preview': 'w-full',
};

const imageClass: Record<SlideBannerVariant, string> = {
  live: 'absolute inset-0 h-full w-full object-cover object-[left_center] lg:object-center',
  'mobile-preview': 'absolute inset-0 h-full w-full object-cover object-[left_center]',
  'desktop-preview': 'absolute inset-0 h-full w-full object-cover object-center',
};

export function SlideBanner({
  src,
  alt = 'Homepage banner slide',
  variant = 'live',
  children,
  className = '',
}: SlideBannerProps) {
  const aspectStyle = variant === 'desktop-preview' ? { aspectRatio: SLIDE_BANNER_ASPECT } : undefined;

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
      />
      {children}
    </div>
  );
}
