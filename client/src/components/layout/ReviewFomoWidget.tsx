import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { orderFomoService } from '@/services/order-fomo.service';

const INITIAL_DELAY_MS = 3_000;
const DISPLAY_MS = 6_000;
const BETWEEN_PURCHASES_MS = 8_000;

export function ReviewFomoWidget() {
  const { data: purchases = [] } = useQuery({
    queryKey: ['daily-order-fomo'],
    queryFn: orderFomoService.getDailyPurchases,
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const purchase = purchases[index % Math.max(purchases.length, 1)];

  useEffect(() => {
    if (!purchases.length || dismissed) {
      setVisible(false);
      return;
    }

    const initialDelay = window.setTimeout(() => setVisible(true), INITIAL_DELAY_MS);
    return () => window.clearTimeout(initialDelay);
  }, [purchases.length, dismissed]);

  useEffect(() => {
    if (!purchases.length || dismissed) return;

    let revealTimer: number | undefined;
    const cycle = window.setInterval(() => {
      setVisible(false);
      revealTimer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % purchases.length);
        setVisible(true);
      }, BETWEEN_PURCHASES_MS - DISPLAY_MS);
    }, BETWEEN_PURCHASES_MS);

    return () => {
      window.clearInterval(cycle);
      if (revealTimer) window.clearTimeout(revealTimer);
    };
  }, [purchases.length, dismissed]);

  if (!purchase || dismissed) return null;

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
            <ShoppingBag className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {purchase.masked_name || 'Customer'} purchased
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300">
              {purchase.product_title}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Verified purchase
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="-mr-1 -mt-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Dismiss purchase notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
