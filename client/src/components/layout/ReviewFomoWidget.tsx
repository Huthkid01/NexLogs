import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquareQuote, Star, X } from 'lucide-react';
import { reviewService } from '@/services/review.service';

const INITIAL_DELAY_MS = 3_000;
const DISPLAY_MS = 6_000;
const BETWEEN_REVIEWS_MS = 8_000;

function maskReviewerName(name?: string | null) {
  const value = name?.trim() || 'Customer';
  const [firstName] = value.split(/\s+/);
  if (firstName.length <= 1) return `${firstName}***`;
  return `${firstName[0]}${'*'.repeat(Math.min(Math.max(firstName.length - 1, 3), 7))}`;
}

export function ReviewFomoWidget() {
  const { data: reviews = [] } = useQuery({
    queryKey: ['approved-review-fomo'],
    queryFn: reviewService.getApprovedFomoReviews,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const review = reviews[index % Math.max(reviews.length, 1)];
  const stars = useMemo(
    () => Array.from({ length: 5 }, (_, starIndex) => starIndex < (review?.rating ?? 0)),
    [review?.rating],
  );

  useEffect(() => {
    if (!reviews.length || dismissed) {
      setVisible(false);
      return;
    }

    const initialDelay = window.setTimeout(() => setVisible(true), INITIAL_DELAY_MS);
    return () => window.clearTimeout(initialDelay);
  }, [reviews.length, dismissed]);

  useEffect(() => {
    if (!reviews.length || dismissed) return;

    let revealTimer: number | undefined;
    const cycle = window.setInterval(() => {
      setVisible(false);
      revealTimer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % reviews.length);
        setVisible(true);
      }, BETWEEN_REVIEWS_MS - DISPLAY_MS);
    }, BETWEEN_REVIEWS_MS);

    return () => {
      window.clearInterval(cycle);
      if (revealTimer) window.clearTimeout(revealTimer);
    };
  }, [reviews.length, dismissed]);

  if (!review || dismissed) return null;

  return (
    <aside
      aria-live="polite"
      className={`fixed bottom-3 left-2 z-50 w-[min(290px,calc(100vw-16px))] transition-all duration-300 sm:bottom-5 sm:left-5 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-dm-border dark:bg-dm-surface/95">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f26522]/10 text-[#f26522]">
            <MessageSquareQuote className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                {maskReviewerName(review.profile?.full_name)} left a review
              </p>
              <div className="flex shrink-0">
                {stars.map((filled, starIndex) => (
                  <Star
                    key={starIndex}
                    className={`h-3 w-3 ${
                      filled
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300">
              {review.product?.title || 'Verified purchase'}
            </p>
            {review.comment ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                “{review.comment}”
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="-mr-1 -mt-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Dismiss review notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
