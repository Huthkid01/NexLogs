import type { ReactNode } from 'react';

export type SlideBannerVariant = 'live' | 'mobile-preview' | 'desktop-preview';

interface SlideBannerProps {
  src: string;
  /** Optional art-directed mobile image (used with <picture>). */
  mobileSrc?: string;
  alt?: string;
  variant?: SlideBannerVariant;
  children?: ReactNode;
  className?: string;
  priority?: boolean;
  /** Prefer left text / CTA for designed banners (default). */
  imagePosition?: 'left' | 'center';
  /**
   * natural = full image visible (best for designed heroes).
   * cover = fixed height crop (admin uploads / AffordableLogs-style).
   */
  fit?: 'natural' | 'cover';
}

const coverVariantClass: Record<SlideBannerVariant, string> = {
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
  mobileSrc,
  alt = 'Homepage banner slide',
  variant = 'live',
  children,
  className = '',
  priority = false,
  imagePosition = 'left',
  fit = 'cover',
}: SlideBannerProps) {
  const position = imagePositionClass[imagePosition];
  const loading = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? 'high' : 'low';

  if (fit === 'natural') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-[#f26522] ${className}`}>
        <picture>
          {mobileSrc ? <source media="(max-width: 767px)" srcSet={mobileSrc} /> : null}
          <img
            src={src}
            alt={alt}
            className="h-auto w-full object-cover object-center"
            draggable={false}
            loading={loading}
            decoding="async"
            fetchPriority={fetchPriority}
          />
        </picture>
        {children}
      </div>
    );
  }

  const imageClass: Record<SlideBannerVariant, string> = {
    live: `absolute inset-0 h-full w-full object-cover ${position}`,
    'mobile-preview': `absolute inset-0 h-full w-full object-cover ${position}`,
    'desktop-preview': `absolute inset-0 h-full w-full object-cover object-center`,
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#f26522] ${coverVariantClass[variant]} ${className}`}
    >
      <picture>
        {mobileSrc ? <source media="(max-width: 767px)" srcSet={mobileSrc} /> : null}
        <img
          src={src}
          alt={alt}
          className={imageClass[variant]}
          draggable={false}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
        />
      </picture>
      {children}
    </div>
  );
}
