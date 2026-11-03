import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Package, RefreshCw, Save, Wallet } from 'lucide-react';
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
import { cn, formatPrice } from '@/lib/utils';
import { loggsplugService } from '@/services/loggsplug.service';

function formatRelativeSyncTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return 'Never';

  const diffMs = Date.now() - at;
  if (diffMs < 0) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 48) return `${hours} hours ago`;
  return new Date(iso).toLocaleString();
}

function syncHealth(iso: string | null | undefined): 'ok' | 'stale' | 'never' {
  if (!iso) return 'never';
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return 'never';
  const ageHours = (Date.now() - at) / 3_600_000;
  // Auto sync runs twice daily (Nigeria morning/night); allow ~14h before stale.
  return ageHours <= 14 ? 'ok' : 'stale';
}

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
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['admin-loggsplug-overview'],
    queryFn: () => loggsplugService.getOverview(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Keep site content in sync with DB lastSyncedAt from overview / auto-sync.
  useEffect(() => {
    const remote = overview?.settings;
    if (!remote?.lastSyncedAt) return;
    if (remote.lastSyncedAt === content.loggsplug.lastSyncedAt) return;
    setContent({
      ...content,
      loggsplug: normalizeLoggsplugSettings({
        ...content.loggsplug,
        lastSyncedAt: remote.lastSyncedAt,
        defaultMarkupPercent: remote.defaultMarkupPercent ?? content.loggsplug.defaultMarkupPercent,
        enabled: remote.enabled ?? content.loggsplug.enabled,
      }),
    });
    // Intentionally depend on remote timestamp only to avoid setContent loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview?.settings?.lastSyncedAt]);

  const lastSyncedAt =
    overview?.settings?.lastSyncedAt
    ?? content.loggsplug.lastSyncedAt
    ?? null;
  const health = syncHealth(lastSyncedAt);

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

  const syncCatalog = async (mode: 'stock' | 'full' = 'stock') => {
    const normalized = normalizeLoggsplugSettings(settingsDraft);
    if (normalized.defaultMarkupPercent < 0) {
      toast.error('Markup cannot be negative.');
      return;
    }

    setSyncing(true);
    setSyncProgress(mode === 'stock' ? 'Syncing stock & prices…' : 'Starting full sync…');
    try {
      const result = await loggsplugService.syncProducts(
        normalized.defaultMarkupPercent,
        ({ synced, total, complete }) => {
          setSyncProgress(
            complete
              ? `Finishing sync (${synced}/${total})…`
              : mode === 'stock'
                ? `Updating stock ${synced}/${total}…`
                : `Syncing descriptions ${synced}/${total}…`,
          );
        },
        mode,
      );
      setContent({
        ...content,
        loggsplug: result.settings,
      });
      setSettingsDraft(result.settings);
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
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
      if (/ip.*(temporarily\s+)?blocked|temporarily\s+blocked/i.test(message)) {
        toast.error(
          'LOGGSPLUG blocked this server IP. Use “Sync stock & prices” (avoids their public pages). Wait a bit before full sync.',
        );
      } else if (/timeout|504|546|wall clock|failed to fetch|network|HTTP 54/i.test(message)) {
        toast.error(
          'Sync timed out on Supabase free tier (150s limit). Use Sync stock & prices, or retry full sync in smaller runs.',
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
          <CardContent className="space-y-3">
            <p className={`text-3xl font-bold ${adminStrongTextClass(isDark)}`}>
              {overviewLoading ? '...' : overview?.active_products ?? 0}
            </p>
            <div
              className={cn(
                'rounded-xl border px-3 py-2.5',
                health === 'ok'
                  ? isDark
                    ? 'border-emerald-800/60 bg-emerald-950/30'
                    : 'border-emerald-200 bg-emerald-50'
                  : health === 'stale'
                    ? isDark
                      ? 'border-amber-800/60 bg-amber-950/30'
                      : 'border-amber-200 bg-amber-50'
                    : isDark
                      ? 'border-dm-border bg-dm-surface'
                      : 'border-slate-200 bg-slate-50',
              )}
            >
              <div className="flex items-start gap-2">
                <Clock3
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    health === 'ok'
                      ? 'text-emerald-600'
                      : health === 'stale'
                        ? 'text-amber-600'
                        : isDark
                          ? 'text-slate-400'
                          : 'text-slate-500',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold', adminStrongTextClass(isDark))}>
                    Last refreshed:{' '}
                    {overviewLoading ? '…' : formatRelativeSyncTime(lastSyncedAt)}
                  </p>
                  <p className={`mt-0.5 text-xs ${adminMutedTextClass(isDark)}`}>
                    {lastSyncedAt
                      ? new Date(lastSyncedAt).toLocaleString()
                      : 'No successful sync recorded yet'}
                  </p>
                  <p className={`mt-1 text-xs ${adminMutedTextClass(isDark)}`}>
                    {health === 'ok'
                      ? 'Auto sync looks healthy (twice daily: morning & night, Nigeria time).'
                      : health === 'stale'
                        ? 'Sync is older than expected — click Refresh or Sync stock & prices.'
                        : 'Run Sync stock & prices once, then auto sync should keep this updated.'}
                  </p>
                  {dataUpdatedAt ? (
                    <p className={`mt-1 text-[11px] ${adminMutedTextClass(isDark)}`}>
                      Status checked {formatRelativeSyncTime(new Date(dataUpdatedAt).toISOString())}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
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
            <Button type="button" onClick={() => void syncCatalog('stock')} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? (syncProgress ?? 'Syncing...') : 'Sync stock & prices'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void syncCatalog('full')}
              disabled={syncing}
            >
              Full sync (descriptions)
            </Button>
            {syncProgress ? (
              <p className={`text-xs ${adminMutedTextClass(isDark)}`}>{syncProgress}</p>
            ) : null}
          </div>
          <p className={`text-xs ${adminMutedTextClass(isDark)}`}>
            Stock sync uses LOGGSPLUG&apos;s reseller product list only (stock, cost, category, prices) — this avoids IP
            blocks. Full sync also refreshes descriptions and is slower. Auto stock sync runs twice daily at 8:00 AM
            and 8:00 PM Nigeria time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
