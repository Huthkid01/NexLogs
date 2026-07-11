import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Monitor, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { formatDisplayPriceWithPeriod } from '@/lib/display-currency';
import {
  getPlanPriceNgn,
  getPlansForLocation,
  getRdpProductSlug,
  type RdpDuration,
  type RdpPlan,
} from '@/lib/rdp-catalog';
import { buildLiveRdpCatalog } from '@/lib/rdp-live-catalog';
import {
  getPurchaseErrorMessage,
  isInsufficientFundsError,
} from '@/lib/purchase-errors';
import { cn } from '@/lib/utils';
import { orderService, productService, profileService } from '@/services';

const ORANGE_LIGHT = 'bg-[#fff4ef] text-[#c2410c] border-[#f26522] dark:bg-[#f26522]/10 dark:text-orange-200 dark:border-[#f26522]';

export default function PurchaseRdpPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { content } = useSiteContent();
  const baseCatalog = content.rdp;

  const { data: rdpProducts = [] } = useQuery({
    queryKey: ['rdp-products'],
    queryFn: () => productService.getActiveRdpProducts(),
    staleTime: 30_000,
  });

  const [locationId, setLocationId] = useState(baseCatalog.locations[0]?.id ?? '');
  const [durationId, setDurationId] = useState(baseCatalog.durations[0]?.id ?? '1-month');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);

  const selectedDuration = useMemo(
    () => baseCatalog.durations.find((duration) => duration.id === durationId) ?? baseCatalog.durations[0],
    [baseCatalog.durations, durationId],
  );

  const catalog = useMemo(() => {
    if (!selectedDuration) return baseCatalog;
    return buildLiveRdpCatalog(baseCatalog, rdpProducts, selectedDuration);
  }, [baseCatalog, rdpProducts, selectedDuration]);

  useEffect(() => {
    if (!catalog.locations.some((location) => location.id === locationId)) {
      setLocationId(catalog.locations[0]?.id ?? '');
      setSelectedPlanId(null);
    }
  }, [catalog.locations, locationId]);

  const visiblePlans = useMemo(
    () => getPlansForLocation(catalog, locationId),
    [catalog, locationId],
  );

  const { data: stats } = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: () => profileService.getStats(user!.id),
    enabled: !!user?.id,
  });

  const handlePurchase = async (plan: RdpPlan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedDuration) {
      toast.error('Select a duration first.');
      return;
    }

    const productSlug = getRdpProductSlug(plan, selectedDuration);
    const priceNgn = getPlanPriceNgn(plan, selectedDuration);
    setPurchasingPlanId(plan.id);

    try {
      const balance = stats?.balance ?? 0;
      if (balance < priceNgn) {
        toast.error('Insufficient wallet balance. Please add funds.');
        navigate('/add-funds');
        return;
      }

      const orderId = await orderService.purchaseRdpBySlug(productSlug, 1);
      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile-stats', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['user-orders', user.id] });
      toast.success(
        'Purchase completed. Check your purchase history within 5 to 10 mins for details.',
        { duration: 8000 },
      );
      navigate('/purchases', { state: { reviewOrderId: orderId } });
    } catch (error: unknown) {
      if (isInsufficientFundsError(error)) {
        toast.error('Insufficient wallet balance. Please add funds.');
        navigate('/add-funds');
        return;
      }
      toast.error(getPurchaseErrorMessage(error));
    } finally {
      setPurchasingPlanId(null);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dm-bg min-h-full">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{catalog.pageTitle}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{catalog.pageSubtitle}</p>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-3">
            Select a Location
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {catalog.locations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => {
                  setLocationId(location.id);
                  setSelectedPlanId(null);
                }}
                className={cn(
                  'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                  locationId === location.id
                    ? ORANGE_LIGHT
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-dm-border dark:bg-dm-surface dark:text-gray-200',
                )}
              >
                {location.label}
              </button>
            ))}
          </div>
        </section>

        {visiblePlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dm-border bg-white dark:bg-dm-surface p-10 text-center">
            <Monitor className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No plans for this location yet</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add RDP plans for this location in Admin → RDP Plans.
            </p>
          </div>
        ) : (
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visiblePlans.map((plan) => {
                const priceNgn = selectedDuration ? getPlanPriceNgn(plan, selectedDuration) : plan.priceUsdMonthly;
                const isSelected = selectedPlanId === plan.id;
                const isPurchasing = purchasingPlanId === plan.id;

                return (
                  <div
                    key={`${plan.id}-${durationId}`}
                    className={cn(
                      'rounded-2xl border bg-white dark:bg-dm-surface p-5 shadow-sm transition-colors',
                      isSelected ? 'border-[#f26522] ring-1 ring-[#f26522]/30' : 'border-gray-200 dark:border-dm-border',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4ef] text-[#f26522] dark:bg-[#f26522]/15 dark:text-orange-300">
                        <Zap className="h-5 w-5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                          isSelected
                            ? 'border-[#f26522] text-[#f26522]'
                            : 'border-gray-200 text-gray-500 dark:border-dm-border dark:text-gray-400',
                        )}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {plan.title} ({plan.ramLabel})
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatDisplayPriceWithPeriod(priceNgn, selectedDuration?.label ?? 'Month')}
                    </p>

                    <ul className="mt-5 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      type="button"
                      className="mt-6 w-full bg-[#f26522] hover:bg-[#d94e0f]"
                      disabled={isPurchasing}
                      onClick={() => handlePurchase(plan)}
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Purchase'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {catalog.durations.length > 1 && (
        <section className="rounded-2xl border border-gray-200 dark:border-dm-border bg-white dark:bg-dm-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-3">
            Select Duration
          </h2>
          <div className="flex flex-wrap gap-3">
            {catalog.durations.map((duration: RdpDuration) => (
              <button
                key={duration.id}
                type="button"
                onClick={() => setDurationId(duration.id)}
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                  durationId === duration.id
                    ? ORANGE_LIGHT
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-dm-border dark:bg-dm-input dark:text-gray-200',
                )}
              >
                {duration.label}
              </button>
            ))}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
