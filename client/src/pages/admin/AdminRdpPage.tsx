import { useEffect, useMemo, useState } from 'react';
import { Monitor, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useTheme } from '@/hooks/useTheme';
import {
  adminInputClass,
  adminMainCardClass,
  adminMutedTextClass,
  adminPageClass,
  adminStrongTextClass,
} from '@/lib/admin-theme';
import {
  DEFAULT_RDP_CATALOG,
  getLocationLabel,
  type RdpCatalog,
  type RdpPlan,
} from '@/lib/rdp-catalog';
import { formatRatePerUsd } from '@/lib/wallet-exchange-rates';
import { AdminDualCurrencyPriceInput } from '@/components/admin/AdminDualCurrencyPriceInput';
import { cn } from '@/lib/utils';

type PlanField = 'title' | 'ramLabel' | 'productSlug';

export default function AdminRdpPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content, setContent } = useSiteContent();
  const [catalog, setCatalog] = useState<RdpCatalog>(content.rdp);
  const [activeLocationId, setActiveLocationId] = useState(catalog.locations[0]?.id ?? 'forex-rdp');

  useEffect(() => {
    setCatalog(content.rdp);
  }, [content.rdp]);

  const plansForLocation = useMemo(
    () => catalog.plans.filter((plan) => plan.locationId === activeLocationId),
    [catalog.plans, activeLocationId],
  );
  const ngnRate = content.wallet.exchangeRates.NGN ?? 1500;

  const saveCatalog = () => {
    setContent({
      ...content,
      rdp: catalog,
    });
    toast.success('RDP catalog updated.');
  };

  const resetCatalog = () => {
    setCatalog(DEFAULT_RDP_CATALOG);
    setActiveLocationId(DEFAULT_RDP_CATALOG.locations[0]?.id ?? 'forex-rdp');
    setContent({
      ...content,
      rdp: DEFAULT_RDP_CATALOG,
    });
    toast.success('RDP catalog reset to defaults.');
  };

  const updateLocationLabel = (locationId: string, label: string) => {
    setCatalog((current) => ({
      ...current,
      locations: current.locations.map((location) =>
        location.id === locationId ? { ...location, label } : location,
      ),
    }));
  };

  const updatePlan = (planId: string, field: PlanField, value: string) => {
    setCatalog((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId ? { ...plan, [field]: value } : plan,
      ),
    }));
  };

  const updatePlanPrice = (planId: string, priceUsdMonthly: number) => {
    setCatalog((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId ? { ...plan, priceUsdMonthly } : plan,
      ),
    }));
  };

  const updatePlanFeatures = (planId: string, value: string) => {
    setCatalog((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              features: value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            }
          : plan,
      ),
    }));
  };

  const renderPlanEditor = (plan: RdpPlan) => (
    <div
      key={plan.id}
      className={cn(
        'rounded-xl border p-4',
        isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-slate-50',
      )}
    >
      <p className={cn('font-semibold', adminStrongTextClass(isDark))}>
        {plan.title} ({plan.ramLabel})
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`${plan.id}-title`}>Plan title</Label>
          <Input
            id={`${plan.id}-title`}
            value={plan.title}
            onChange={(event) => updatePlan(plan.id, 'title', event.target.value)}
            className={adminInputClass(isDark)}
          />
        </div>
        <div>
          <Label htmlFor={`${plan.id}-ram`}>RAM label</Label>
          <Input
            id={`${plan.id}-ram`}
            value={plan.ramLabel}
            onChange={(event) => updatePlan(plan.id, 'ramLabel', event.target.value)}
            className={adminInputClass(isDark)}
          />
        </div>
        <div>
          <AdminDualCurrencyPriceInput
            usdAmount={plan.priceUsdMonthly}
            onUsdChange={(priceUsdMonthly) => updatePlanPrice(plan.id, priceUsdMonthly)}
            rates={content.wallet.exchangeRates}
            usdLabel="Monthly price (USD)"
            ngnLabel="Monthly price (NGN)"
            isDark={isDark}
            className="md:col-span-2"
          />
          <p className={cn('mt-2 text-xs', adminMutedTextClass(isDark))}>
            Uses your exchange rate: {formatRatePerUsd('NGN', ngnRate)}. Wallet charges stay in USD.
          </p>
        </div>
        <div>
          <Label htmlFor={`${plan.id}-slug`}>Product slug base</Label>
          <Input
            id={`${plan.id}-slug`}
            value={plan.productSlug}
            onChange={(event) => updatePlan(plan.id, 'productSlug', event.target.value)}
            className={adminInputClass(isDark)}
          />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor={`${plan.id}-features`}>Features (one per line)</Label>
        <Textarea
          id={`${plan.id}-features`}
          value={plan.features.join('\n')}
          onChange={(event) => updatePlanFeatures(plan.id, event.target.value)}
          className={cn('mt-2 admin-textarea min-h-[160px]', adminInputClass(isDark))}
        />
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-6', adminPageClass(isDark))}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={cn('text-2xl font-bold', adminStrongTextClass(isDark))}>RDP Plans</h1>
          <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
            Edit Forex and city RDP plans. Set monthly prices in USD or NGN — the other amount updates using your
            Exchange Rates settings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetCatalog}>
            Reset
          </Button>
          <Button type="button" onClick={saveCatalog}>
            <Save className="h-4 w-4 mr-2" />
            Save Catalog
          </Button>
        </div>
      </div>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Page Content
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="rdp-title">Page title</Label>
            <Input
              id="rdp-title"
              value={catalog.pageTitle}
              onChange={(event) => setCatalog((current) => ({ ...current, pageTitle: event.target.value }))}
              className={adminInputClass(isDark)}
            />
          </div>
          <div>
            <Label htmlFor="rdp-subtitle">Page subtitle</Label>
            <Input
              id="rdp-subtitle"
              value={catalog.pageSubtitle}
              onChange={(event) => setCatalog((current) => ({ ...current, pageSubtitle: event.target.value }))}
              className={adminInputClass(isDark)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription className={adminMutedTextClass(isDark)}>
            Tab labels on the Purchase RDP page. Create matching products with slug
            {' '}
            <code>{'{productSlug}-{months}-month'}</code>
            {' '}
            (example:
            {' '}
            <code>forex-rdp-4gb-1-month</code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {catalog.locations.map((location) => (
              <Button
                key={location.id}
                type="button"
                size="sm"
                variant={activeLocationId === location.id ? 'default' : 'outline'}
                className={activeLocationId === location.id ? 'bg-[#f26522] hover:bg-[#d94e0f]' : undefined}
                onClick={() => setActiveLocationId(location.id)}
              >
                {location.label}
              </Button>
            ))}
          </div>

          {activeLocationId && (
            <div>
              <Label htmlFor={`location-label-${activeLocationId}`}>Location tab label</Label>
              <Input
                id={`location-label-${activeLocationId}`}
                value={getLocationLabel(catalog, activeLocationId)}
                onChange={(event) => updateLocationLabel(activeLocationId, event.target.value)}
                className={cn('mt-2 max-w-md', adminInputClass(isDark))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <CardTitle>
            Plans — {getLocationLabel(catalog, activeLocationId)}
          </CardTitle>
          <CardDescription className={adminMutedTextClass(isDark)}>
            {activeLocationId === 'forex-rdp'
              ? 'Forex plans use trading-optimised specs (Ryzen, NVMe, Frankfurt).'
              : 'City plans share the same Atlanta-style specs. Edit each location independently.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plansForLocation.length === 0 ? (
            <p className={cn('text-sm', adminMutedTextClass(isDark))}>
              No plans for this location yet. Click Reset to load defaults.
            </p>
          ) : (
            plansForLocation.map(renderPlanEditor)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
