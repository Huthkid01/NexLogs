import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/utils';
import { QUICK_TOUR_STEPS, type QuickTourStep } from '@/lib/quick-tour';
import { SiteWalkthroughPreview } from '@/components/onboarding/walkthrough/SiteWalkthroughPreview';

interface QuickTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getSpotlightRect(target: string): SpotlightRect | null {
  const element = document.querySelector(target);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const padding = 8;

  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getCardPosition(step: QuickTourStep, rect: SpotlightRect | null) {
  if (step.placement === 'center' || step.placement === 'demo' || !rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: step.placement === 'demo' ? 'min(460px, calc(100vw - 32px))' : 'min(420px, calc(100vw - 32px))',
    } as const;
  }

  const cardWidth = Math.min(380, window.innerWidth - 32);
  const preferredTop = rect.top + rect.height + 16;
  const fitsBelow = preferredTop + 220 < window.innerHeight;
  const top = fitsBelow ? preferredTop : Math.max(16, rect.top - 220);
  const left = Math.min(
    Math.max(16, rect.left),
    window.innerWidth - cardWidth - 16,
  );

  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: 'none',
    width: `${cardWidth}px`,
  } as const;
}

export function QuickTour({ open, onClose, onComplete }: QuickTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  const step = QUICK_TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === QUICK_TOUR_STEPS.length - 1;

  useScrollLock(open);

  const updateSpotlight = useCallback(() => {
    if (!open || !step || step.placement !== 'spotlight') {
      setSpotlightRect(null);
      return;
    }

    setSpotlightRect(getSpotlightRect(step.target));
  }, [open, step]);

  useLayoutEffect(() => {
    updateSpotlight();
  }, [updateSpotlight, stepIndex]);

  useEffect(() => {
    if (!open) return;

    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open, updateSpotlight]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSpotlightRect(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !step) return null;

  const cardStyle = getCardPosition(step, spotlightRect);

  const finish = () => {
    onComplete();
    onClose();
  };

  const goNext = () => {
    if (isLastStep) {
      finish();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-labelledby="quick-tour-title">
      <div className="absolute inset-0 bg-slate-950/70" onClick={onClose} aria-hidden />

      {spotlightRect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-[#f26522] ring-offset-2 ring-offset-transparent"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72)',
          }}
        />
      )}

      <div
        className={cn(
          'absolute rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl',
          'dark:border-dm-border dark:bg-dm-surface',
        )}
        style={cardStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f26522]">
              Quick tour · {stepIndex + 1} of {QUICK_TOUR_STEPS.length}
            </p>
            <h2 id="quick-tour-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-dm-input dark:hover:text-slate-100"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>

        {step.placement === 'demo' && <SiteWalkthroughPreview step={step} />}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={goBack}>
                Back
              </Button>
            )}
            <Button type="button" size="sm" onClick={goNext}>
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
