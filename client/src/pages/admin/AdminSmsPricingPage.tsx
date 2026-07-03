import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Save, Smartphone, Wallet, History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { defaultSiteContent } from '@/contexts/site-content';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useTheme } from '@/hooks/useTheme';
import {
  adminInputClass,
  adminMainCardClass,
  adminMutedTextClass,
  adminPageClass,
  adminStrongTextClass,
} from '@/lib/admin-theme';
import { formatDisplayPrice } from '@/lib/display-currency';
import { formatUsd, normalizeSmsPricing } from '@/lib/sms-pricing';
import { smsNumberService } from '@/services/sms-number.service';

const POPULAR_SERVICE_NAMES = ['whatsapp', 'telegram', 'google', 'facebook', 'instagram', 'tiktok'];

function sortServices<T extends { id: string; name: string }>(services: T[]) {
  return [...services].sort((a, b) => {
    const aIndex = POPULAR_SERVICE_NAMES.findIndex((name) => a.name.toLowerCase().includes(name));
    const bIndex = POPULAR_SERVICE_NAMES.findIndex((name) => b.name.toLowerCase().includes(name));
    const aRank = aIndex === -1 ? 999 : aIndex;
    const bRank = bIndex === -1 ? 999 : bIndex;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

export default function AdminSmsPricingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content, setContent } = useSiteContent();
  const [serviceId, setServiceId] = useState('');
  const [pricingDraft, setPricingDraft] = useState(() => normalizeSmsPricing(content.smsPricing));

  useEffect(() => {
    setPricingDraft(normalizeSmsPricing(content.smsPricing));
  }, [content.smsPricing]);

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['admin-sms-overview'],
    queryFn: () => smsNumberService.getAdminOverview(),
    staleTime: 60_000,
  });

  const services = useMemo(
    () => sortServices(overview?.services ?? []),
    [overview?.services],
  );

  useEffect(() => {
    if (!services.length || serviceId) return;
    setServiceId(services[0].id);
  }, [services, serviceId]);

  const {
    data: servicePrices,
    isFetching: pricesLoading,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: ['admin-sms-service-prices', serviceId],
    queryFn: () => smsNumberService.getAdminServicePrices(serviceId),
    enabled: Boolean(serviceId),
    staleTime: 60_000,
  });

  const {
    data: providerHistory,
    isFetching: providerHistoryLoading,
    refetch: refetchProviderHistory,
  } = useQuery({
    queryKey: ['admin-sms-provider-history'],
    queryFn: () => smsNumberService.getAdminProviderHistory(),
    staleTime: 60_000,
  });

  const selectedService = services.find((service) => service.id === serviceId);

  const savePricing = () => {
    const normalized = normalizeSmsPricing(pricingDraft);

    if (normalized.usdNgnRate <= 0) {
      toast.error('USD to NGN rate must be greater than zero.');
      return;
    }

    if (normalized.markupPercent < 0) {
      toast.error('Markup cannot be negative.');
      return;
    }

    setContent({
      ...content,
      smsPricing: normalized,
    });
    toast.success('SMS pricing settings saved.');
  };

  const resetPricing = () => {
    const defaults = normalizeSmsPricing(defaultSiteContent.smsPricing);
    setPricingDraft(defaults);
    setContent({
      ...content,
      smsPricing: defaults,
    });
    toast.success('SMS pricing reset to defaults.');
  };

  return (
    <div className={`space-y-6 ${adminPageClass(isDark)}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${adminStrongTextClass(isDark)}`}>SMS Number Pricing</h1>
          <p className={`mt-1 text-sm ${adminMutedTextClass(isDark)}`}>
            View SMS Pool prices, set one global markup for all services, and see your profit per country.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void refetchOverview()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={resetPricing}>
            Reset
          </Button>
          <Button type="button" onClick={savePricing}>
            <Save className="mr-2 h-4 w-4" />
            Save settings
          </Button>
        </div>
      </div>

      {overviewError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          Could not load SMS Pool data. Check that `SMSPOOL_API_KEY` is set in Supabase secrets and redeploy the `smspool` function.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={adminMainCardClass(isDark)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              SMS Pool balance
            </CardTitle>
            <CardDescription className={adminMutedTextClass(isDark)}>
              Your provider account balance in USD. Top up at smspool.net if this is low.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${adminStrongTextClass(isDark)}`}>
              {overviewLoading ? '...' : formatUsd(overview?.balance_usd ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className={adminMainCardClass(isDark)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Global pricing
            </CardTitle>
            <CardDescription className={adminMutedTextClass(isDark)}>
              SMS Pool charges in USD — set your NGN conversion rate and profit markup here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-usd-ngn-rate">USD to NGN rate</Label>
              <Input
                id="sms-usd-ngn-rate"
                type="text"
                inputMode="decimal"
                value={pricingDraft.usdNgnRate}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setPricingDraft((current) => ({
                      ...current,
                      usdNgnRate: value === '' ? 0 : Number(value),
                    }));
                  }
                }}
                className={adminInputClass(isDark)}
              />
              <p className={`text-xs ${adminMutedTextClass(isDark)}`}>
                How many naira equals $1 from SMS Pool. Example: 1500 means $0.50 WhatsApp costs ₦750 before markup.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-markup-percent">Profit markup (%)</Label>
              <Input
                id="sms-markup-percent"
                type="text"
                inputMode="decimal"
                value={pricingDraft.markupPercent}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setPricingDraft((current) => ({
                      ...current,
                      markupPercent: value === '' ? 0 : Number(value),
                    }));
                  }
                }}
                className={adminInputClass(isDark)}
              />
              <p className={`text-xs ${adminMutedTextClass(isDark)}`}>
                {pricingDraft.markupPercent}% markup on a $1.00 SMS Pool number ={' '}
                {formatDisplayPrice(
                  Math.ceil(pricingDraft.usdNgnRate * (1 + pricingDraft.markupPercent / 100)),
                )}{' '}
                customer price.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Service price preview</CardTitle>
              <CardDescription className={adminMutedTextClass(isDark)}>
                Pick a service to load SMS Pool prices for all available countries.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-80">
              <Label htmlFor="sms-service-select">Service</Label>
              <select
                id="sms-service-select"
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                disabled={overviewLoading || !services.length}
                className={adminInputClass(isDark)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm ${adminMutedTextClass(isDark)}`}>
              {selectedService ? `Showing prices for ${selectedService.name}` : 'Select a service'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!serviceId || pricesLoading}
              onClick={() => void refetchPrices()}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              Reload prices
            </Button>
          </div>

          {!servicePrices?.rows.length ? (
            <p className={`text-sm ${adminMutedTextClass(isDark)}`}>
              {pricesLoading ? 'Loading SMS Pool prices...' : 'No prices returned for this service.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-dm-border' : 'border-gray-200'} ${adminMutedTextClass(isDark)}`}>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">SMS Pool</th>
                    <th className="px-3 py-2 font-medium">Your price</th>
                    <th className="px-3 py-2 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePrices.rows.map((row) => (
                    <tr
                      key={`${row.country_id}-${row.pool ?? 'default'}`}
                      className={`border-b ${isDark ? 'border-dm-border/70' : 'border-gray-100'}`}
                    >
                      <td className="px-3 py-3">
                        <div className={`font-medium ${adminStrongTextClass(isDark)}`}>{row.country_name}</div>
                        {row.country_code && (
                          <div className={`text-xs ${adminMutedTextClass(isDark)}`}>{row.country_code}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">{formatUsd(row.cost_usd)}</td>
                      <td className="px-3 py-3 font-medium text-[#f26522]">
                        {formatDisplayPrice(row.charged_ngn)}
                      </td>
                      <td className="px-3 py-3 text-green-600 dark:text-green-400">
                        {formatDisplayPrice(row.profit_ngn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                SMS Pool provider history
              </CardTitle>
              <CardDescription className={adminMutedTextClass(isDark)}>
                Raw order history from SMS Pool for dispute handling and reconciliation with your Nexlogs orders.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={providerHistoryLoading}
              onClick={() => void refetchProviderHistory()}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${providerHistoryLoading ? 'animate-spin' : ''}`} />
              Reload history
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!providerHistory?.rows.length ? (
            <p className={`text-sm ${adminMutedTextClass(isDark)}`}>
              {providerHistoryLoading ? 'Loading SMS Pool history...' : 'No provider history returned.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-dm-border' : 'border-gray-200'} ${adminMutedTextClass(isDark)}`}>
                    <th className="px-3 py-2 font-medium">Order ID</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Cost</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {providerHistory.rows.slice(0, 100).map((row) => (
                    <tr
                      key={row.orderId}
                      className={`border-b ${isDark ? 'border-dm-border/70' : 'border-gray-100'}`}
                    >
                      <td className="px-3 py-3 font-mono text-xs">{row.orderId}</td>
                      <td className="px-3 py-3">{row.phoneNumber ?? '—'}</td>
                      <td className="px-3 py-3">{row.service ?? '—'}</td>
                      <td className="px-3 py-3">{row.countryCode ?? '—'}</td>
                      <td className="px-3 py-3 capitalize">{row.status ?? '—'}</td>
                      <td className="px-3 py-3 font-medium text-green-600 dark:text-green-400">
                        {row.code ?? '—'}
                      </td>
                      <td className="px-3 py-3">{row.costUsd != null ? formatUsd(row.costUsd) : '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{row.createdAt ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
