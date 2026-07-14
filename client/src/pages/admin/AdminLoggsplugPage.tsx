import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, RefreshCw, Save, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  calculateLoggsplugProfit,
  calculateLoggsplugRetailPrice,
  DEFAULT_LOGGSPLUG_SETTINGS,
  normalizeLoggsplugSettings,
  type LoggsplugSettings,
} from '@/lib/loggsplug-pricing';
import { formatPrice } from '@/lib/utils';
import { loggsplugService } from '@/services/loggsplug.service';

export default function AdminLoggsplugPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content, setContent } = useSiteContent();
  const [settingsDraft, setSettingsDraft] = useState<LoggsplugSettings>(content.loggsplug);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  useEffect(() => {
    setSettingsDraft(content.loggsplug);
  }, [content.loggsplug]);

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['admin-loggsplug-overview'],
    queryFn: () => loggsplugService.getOverview(),
    staleTime: 60_000,
  });

  const saveSettings = () => {
    const normalized = normalizeLoggsplugSettings(settingsDraft);
    setContent({
      ...content,
      loggsplug: normalized,
    });
    setSettingsDraft(normalized);
    toast.success('LOGGSPLUG settings saved.');
  };

  const resetSettings = () => {
    setSettingsDraft(DEFAULT_LOGGSPLUG_SETTINGS);
    setContent({
      ...content,
      loggsplug: DEFAULT_LOGGSPLUG_SETTINGS,
    });
    toast.success('LOGGSPLUG settings reset to defaults.');
  };

  const syncCatalog = async () => {
    const normalized = normalizeLoggsplugSettings(settingsDraft);
    if (normalized.defaultMarkupPercent < 0) {
      toast.error('Markup cannot be negative.');
      return;
    }

    setSyncing(true);
    setSyncProgress('Starting sync…');
    try {
      const result = await loggsplugService.syncProducts(
        normalized.defaultMarkupPercent,
        ({ synced, total, complete }) => {
          setSyncProgress(
            complete
              ? `Finishing sync (${synced}/${total})…`
              : `Syncing descriptions ${synced}/${total}…`,
          );
        },
      );
      setContent({
        ...content,
        loggsplug: result.settings,
      });
      setSettingsDraft(result.settings);
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void refetchOverview();
      if (result.failed && result.failed > 0) {
        const sample = result.failures?.[0];
        toast.warning(
          `Synced ${result.synced} products, ${result.failed} failed${sample ? `: ${sample.name}` : ''}.`,
        );
      } else {
        toast.success(`Synced ${result.synced} products (${result.deactivated} deactivated).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Catalog sync failed.';
      if (/timeout|504|546|wall clock|failed to fetch|network|HTTP 54/i.test(message)) {
        toast.error(
          'Sync timed out on Supabase free tier (150s limit). Deploy the latest loggsplug function, then click Sync again — it now runs in smaller chunks.',
        );
      } else {
        toast.error(message);
      }
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const exampleCost = 5000;
  const exampleRetail = calculateLoggsplugRetailPrice(exampleCost, settingsDraft.defaultMarkupPercent);
  const exampleProfit = calculateLoggsplugProfit(exampleCost, settingsDraft.defaultMarkupPercent);

  return (
    <div className={`space-y-6 ${adminPageClass(isDark)}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${adminStrongTextClass(isDark)}`}>LOGGSPLUG supplier</h1>
          <p className={`mt-1 text-sm ${adminMutedTextClass(isDark)}`}>
            Supplier prices are in NGN. Set your profit markup, sync the catalog, and fulfill purchases from your Nexlogs wallet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void refetchOverview()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={resetSettings}>
            Reset
          </Button>
          <Button type="button" onClick={saveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save settings
          </Button>
        </div>
      </div>

      {overviewError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          Could not load LOGGSPLUG data.{' '}
          {overviewError instanceof Error ? overviewError.message : 'Request failed.'}{' '}
          Check that LOGGSPLUG_API_KEY is set in Supabase secrets and redeploy the loggsplug function.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={adminMainCardClass(isDark)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              LOGGSPLUG balance
            </CardTitle>
            <CardDescription className={adminMutedTextClass(isDark)}>
              Your reseller wallet at loggsplug.online. Top up there if this is low.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={`text-3xl font-bold ${adminStrongTextClass(isDark)}`}>
              {overviewLoading ? '...' : formatPrice(overview?.balance_ngn ?? 0)}
            </p>
            {overview?.business_name ? (
              <p className={`text-sm ${adminMutedTextClass(isDark)}`}>{overview.business_name}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={adminMainCardClass(isDark)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Catalog status
            </CardTitle>
            <CardDescription className={adminMutedTextClass(isDark)}>
              Active synced products currently listed on your marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={`text-3xl font-bold ${adminStrongTextClass(isDark)}`}>
              {overviewLoading ? '...' : overview?.active_products ?? 0}
            </p>
            <p className={`text-sm ${adminMutedTextClass(isDark)}`}>
              Last synced:{' '}
              {content.loggsplug.lastSyncedAt
                ? new Date(content.loggsplug.lastSyncedAt).toLocaleString()
                : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <CardTitle>Profit markup</CardTitle>
          <CardDescription className={adminMutedTextClass(isDark)}>
            Retail price = supplier cost × (1 + markup%). You can override markup per product in Products after sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settingsDraft.enabled}
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, enabled: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={adminStrongTextClass(isDark)}>Enable LOGGSPLUG purchases on marketplace</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loggsplug-markup">Default profit markup (%)</Label>
              <Input
                id="loggsplug-markup"
                type="text"
                inputMode="decimal"
                value={settingsDraft.defaultMarkupPercent}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setSettingsDraft((current) => ({
                      ...current,
                      defaultMarkupPercent: value === '' ? 0 : Number(value),
                    }));
                  }
                }}
                className={adminInputClass(isDark)}
              />
              <p className={`text-xs ${adminMutedTextClass(isDark)}`}>
                Example: {formatPrice(exampleCost)} supplier cost + {settingsDraft.defaultMarkupPercent}% ={' '}
                {formatPrice(exampleRetail)} retail ({formatPrice(exampleProfit)} profit).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void syncCatalog()} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? (syncProgress ?? 'Syncing...') : 'Sync catalog & apply markup'}
            </Button>
            {syncProgress ? (
              <p className={`text-xs ${adminMutedTextClass(isDark)}`}>{syncProgress}</p>
            ) : null}
          </div>
          <p className={`text-xs ${adminMutedTextClass(isDark)}`}>
            Sync pulls stock, costs, and product descriptions from LOGGSPLUG in small chunks (needed on Supabase free
            tier&apos;s 150s limit), then recalculates retail prices. Keep this tab open until progress finishes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
