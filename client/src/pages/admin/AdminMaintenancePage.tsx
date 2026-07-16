import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useSiteContent } from '@/hooks/useSiteContent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminMaintenancePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content, setContent } = useSiteContent();
  const [maintenanceDraft, setMaintenanceDraft] = useState({
    enabled: content.maintenance.enabled,
    title: content.maintenance.title,
    message: content.maintenance.message,
  });
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    setMaintenanceDraft({
      enabled: content.maintenance.enabled,
      title: content.maintenance.title,
      message: content.maintenance.message,
    });
  }, [content.maintenance.enabled, content.maintenance.title, content.maintenance.message]);

  const handleSaveMaintenance = async () => {
    const title = maintenanceDraft.title.trim();
    const message = maintenanceDraft.message.trim();
    if (!title || !message) {
      toast.error('Add a maintenance title and message before saving.');
      return;
    }

    setSavingMaintenance(true);
    try {
      setContent({
        ...content,
        maintenance: {
          enabled: maintenanceDraft.enabled,
          title,
          message,
        },
      });
      toast.success(
        maintenanceDraft.enabled
          ? 'Maintenance mode is ON — the public site is locked for users'
          : 'Maintenance mode is OFF — users can use the website again',
      );
    } catch {
      toast.error('Could not save maintenance settings');
    } finally {
      setSavingMaintenance(false);
    }
  };

  return (
    <div className={cn('space-y-6', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div>
        <h1 className="admin-heading text-3xl font-semibold">Maintenance mode</h1>
        <p className={cn('mt-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Lock the public site so users only see the maintenance screen. Admin pages stay usable.
        </p>
      </div>

      <Card
        className={cn(
          'rounded-2xl',
          isDark
            ? 'border-[#18263b] bg-[#0a1527] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]'
            : 'border-slate-200 bg-white text-slate-900 shadow-sm',
        )}
      >
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  maintenanceDraft.enabled
                    ? 'bg-amber-500/15 text-amber-300'
                    : isDark
                      ? 'bg-slate-700/40 text-slate-300'
                      : 'bg-slate-100 text-slate-600',
                )}
              >
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h2 className="admin-heading text-2xl font-semibold">Website lock</h2>
                <p className={cn('mt-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                  When enabled, public users only see the maintenance screen and cannot use the site.
                  Turn it off to restore normal access.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                maintenanceDraft.enabled
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : isDark
                    ? 'border-slate-600 bg-slate-800 text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
              )}
            >
              {maintenanceDraft.enabled ? 'ON' : 'OFF'}
            </Badge>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#f26522] focus:ring-[#f26522]"
              checked={maintenanceDraft.enabled}
              onChange={(event) =>
                setMaintenanceDraft((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            Lock website for all users (maintenance screen only)
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Popup title
              </label>
              <input
                value={maintenanceDraft.title}
                onChange={(event) =>
                  setMaintenanceDraft((current) => ({ ...current, title: event.target.value }))
                }
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#f26522]/30',
                  isDark ? 'border-[#243247] bg-[#081624] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
                )}
                placeholder="Scheduled maintenance"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Popup message
              </label>
              <textarea
                value={maintenanceDraft.message}
                onChange={(event) =>
                  setMaintenanceDraft((current) => ({ ...current, message: event.target.value }))
                }
                rows={4}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#f26522]/30',
                  isDark ? 'border-[#243247] bg-[#081624] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
                )}
                placeholder="Explain the maintenance window to users"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-[#f26522] hover:bg-[#d94e0f]"
              loading={savingMaintenance}
              onClick={() => void handleSaveMaintenance()}
            >
              Save maintenance settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
