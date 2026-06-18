import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="relative w-full">
      <div className="relative rounded-2xl overflow-hidden bg-[#f26522] h-[150px] sm:h-[180px] lg:h-[200px]">
        <img
          src={slideImageUrl}
          alt={slide.title || 'Homepage banner slide'}
          className="w-full h-full object-contain object-center"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

        {hasOverlayContent && (
          <div className="absolute inset-y-0 left-0 z-10 flex max-w-[70%] items-center px-5 sm:px-7">
            <div className="space-y-2 sm:space-y-3">
              {slide.title && (
                <h2 className="max-w-md text-lg font-bold text-white sm:text-2xl">
                  {slide.title}
                </h2>
              )}
              {slide.description && (
                <p className="max-w-md text-xs text-white/85 sm:text-sm">
                  {slide.description}
                </p>
              )}
              {slide.ctaLabel && slide.linkUrl && (
                <Button type="button" size="sm" className="mt-1" onClick={handleSlideAction}>
                  {slide.ctaLabel}
                </Button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/90 hover:text-white z-10 drop-shadow-md"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => setCurrent((c) => (c + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/90 hover:text-white z-10 drop-shadow-md"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors shadow-sm ${
                i === safeCurrent ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
