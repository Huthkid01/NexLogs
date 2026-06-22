import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SlideBanner } from '@/components/home/SlideBanner';
import { useSiteContent } from '@/hooks/useSiteContent';

function resolveSlideImageUrl(imageUrl: string) {
  const value = imageUrl.trim();
  if (!value) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith('/')) return new URL(value, window.location.origin).toString();
  return new URL(`/${value}`, window.location.origin).toString();
}

export function PlatformCarousel() {
  const { content } = useSiteContent();
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const slides = content.slides
    .filter((slide) => slide.active)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const safeCurrent = current % slides.length;
  const slide = slides[safeCurrent];
  const slideImageUrl = resolveSlideImageUrl(slide.imageUrl);
  const hasOverlayContent = Boolean(slide.title || slide.description || (slide.ctaLabel && slide.linkUrl));

  const handleSlideAction = () => {
    const target = slide.linkUrl.trim();
    if (!target) return;

    if (/^https?:\/\//i.test(target)) {
      window.location.assign(target);
      return;
    }

    if (target.startsWith('#')) {
      navigate(`/${target}`);
      return;
    }

    navigate(target);
  };

  const showNavigation = slides.length > 1;

  return (
    <div className="relative w-full">
      <SlideBanner src={slideImageUrl} alt={slide.title || 'Homepage banner slide'} variant="live">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent sm:from-black/70 sm:via-black/35" />

        {hasOverlayContent && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex max-w-[85%] items-center px-3 sm:max-w-[80%] sm:px-7">
            <div className="space-y-1 sm:space-y-3">
              {slide.title && (
                <h2 className="max-w-md text-sm font-bold leading-tight text-white drop-shadow sm:text-2xl">
                  {slide.title}
                </h2>
              )}
              {slide.description && (
                <p className="max-w-md text-[11px] leading-snug text-white/90 drop-shadow sm:text-sm">
                  {slide.description}
                </p>
              )}
              {slide.ctaLabel && slide.linkUrl && (
                <Button
                  type="button"
                  size="sm"
                  className="pointer-events-auto mt-0.5 h-7 px-2.5 text-xs sm:mt-1 sm:h-9 sm:px-3 sm:text-sm"
                  onClick={handleSlideAction}
                >
                  {slide.ctaLabel}
                </Button>
              )}
            </div>
          </div>
        )}

        {showNavigation && (
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-1.5 w-1.5 rounded-full shadow-sm transition-colors ${
                i === safeCurrent ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        )}
      </SlideBanner>
    </div>
  );
}
