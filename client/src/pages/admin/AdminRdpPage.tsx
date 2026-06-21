import { useEffect, useState } from 'react';
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
import { DEFAULT_RDP_CATALOG, type RdpCatalog } from '@/lib/rdp-catalog';
import { cn } from '@/lib/utils';

export default function AdminRdpPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content, setContent } = useSiteContent();
  const [catalog, setCatalog] = useState<RdpCatalog>(content.rdp);

  useEffect(() => {
    setCatalog(content.rdp);
  }, [content.rdp]);

  const saveCatalog = () => {
    setContent({
      ...content,
      rdp: catalog,
    });
    toast.success('RDP catalog updated.');
  };

  const resetCatalog = () => {
    setCatalog(DEFAULT_RDP_CATALOG);
    setContent({
      ...content,
      rdp: DEFAULT_RDP_CATALOG,
    });
    toast.success('RDP catalog reset to defaults.');
  };

  const updatePlan = (planId: string, field: 'priceUsdMonthly' | 'productSlug', value: string) => {
    setCatalog((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              [field]: field === 'priceUsdMonthly' ? Number(value) || 0 : value,
            }
          : plan,
      ),
    }));
  };

  return (
    <div className={cn('space-y-6', adminPageClass(isDark))}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={cn('text-2xl font-bold', adminStrongTextClass(isDark))}>RDP Plans</h1>
          <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
            Manage RDP locations, pricing, and product slugs used on the Purchase RDP page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetCatalog}>Reset</Button>
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
          <CardTitle>Plans</CardTitle>
          <CardDescription className={adminMutedTextClass(isDark)}>
            Prices are stored in USD. NGN display uses your Exchange Rates settings. Create matching products with slug
            {' '}
            <code>{'{productSlug}-{months}-month'}</code>
            {' '}
            (example:
            {' '}
            <code>atlanta-rdp-2gb-1-month</code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalog.plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'rounded-xl border p-4',
                isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-slate-50',
              )}
            >
              <p className={cn('font-semibold', adminStrongTextClass(isDark))}>
                {plan.title} ({plan.ramLabel}) — {catalog.locations.find((location) => location.id === plan.locationId)?.label}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor={`${plan.id}-price`}>Monthly price (USD)</Label>
                  <Input
                    id={`${plan.id}-price`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={plan.priceUsdMonthly}
                    onChange={(event) => updatePlan(plan.id, 'priceUsdMonthly', event.target.value)}
                    className={adminInputClass(isDark)}
                  />
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
              <Textarea
                value={plan.features.join('\n')}
                onChange={(event) =>
                  setCatalog((current) => ({
                    ...current,
                    plans: current.plans.map((entry) =>
                      entry.id === plan.id
                        ? { ...entry, features: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }
                        : entry,
                    ),
                  }))
                }
                className={cn('mt-4 admin-textarea min-h-[120px]', adminInputClass(isDark))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
