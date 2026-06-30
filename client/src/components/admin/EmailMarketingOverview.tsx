import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ChevronDown, ChevronRight, MousePointerClick, MailCheck, MailX, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { marketingTrackingService, type MarketingBatchOverview, type MarketingSourceType } from '@/services/marketing-tracking.service';
import { cn } from '@/lib/utils';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function BatchRecipientDetails({
  sourceType,
  sourceId,
}: {
  sourceType: MarketingSourceType;
  sourceId: string;
}) {
  const { data: sends, isLoading } = useQuery({
    queryKey: ['email-marketing-sends', sourceType, sourceId],
    queryFn: () => marketingTrackingService.getSendsForBatch(sourceType, sourceId),
  });

  if (isLoading) {
    return <Skeleton className="mt-3 h-24 w-full" />;
  }

  if (!sends?.length) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        No per-recipient tracking data yet. New sends after the tracking update will appear here.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Recipient</th>
            <th className="px-3 py-2 font-medium">Delivered</th>
            <th className="px-3 py-2 font-medium">Opened</th>
            <th className="px-3 py-2 font-medium">Clicked</th>
          </tr>
        </thead>
        <tbody>
          {sends.map((send) => (
            <tr key={send.id} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{send.recipient_email}</td>
              <td className="px-3 py-2">
                {send.send_status === 'sent' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <MailCheck className="h-3.5 w-3.5" />
                    Yes
                  </span>
                ) : send.send_status === 'failed' ? (
                  <span className="inline-flex items-center gap-1 text-red-600" title={send.send_error ?? undefined}>
                    <MailX className="h-3.5 w-3.5" />
                    Failed
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </td>
              <td className="px-3 py-2">
                {send.open_count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
                    <Eye className="h-3.5 w-3.5" />
                    {send.open_count}×
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                {send.click_count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#f26522]">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {send.click_count}×
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchOverviewRow({ batch }: { batch: MarketingBatchOverview }) {
  const [open, setOpen] = useState(false);
  const openRate = batch.delivered_count > 0
    ? Math.round((batch.opened_count / batch.delivered_count) * 100)
    : 0;
  const clickRate = batch.delivered_count > 0
    ? Math.round((batch.clicked_count / batch.delivered_count) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30"
      >
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{batch.subject}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {batch.source_type === 'broadcast' ? 'Product' : 'HTML'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(batch.sent_at)}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span>{batch.delivered_count}/{batch.recipient_count} delivered</span>
            <span>{batch.opened_count} opened ({openRate}%)</span>
            <span>{batch.clicked_count} clicked ({clickRate}%)</span>
            {batch.failed_count > 0 ? <span className="text-red-600">{batch.failed_count} failed</span> : null}
          </div>
        </div>
      </button>
      {open ? (
        <div className="border-t border-border px-4 pb-4">
          <BatchRecipientDetails sourceType={batch.source_type} sourceId={batch.source_id} />
        </div>
      ) : null}
    </div>
  );
}

export function EmailMarketingOverview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['email-marketing-overview'],
    queryFn: () => marketingTrackingService.getBatchOverview(12),
    refetchInterval: 30_000,
  });

  const totals = useMemo(() => {
    const rows = data ?? [];
    return rows.reduce(
      (acc, row) => ({
        delivered: acc.delivered + row.delivered_count,
        opened: acc.opened + row.opened_count,
        clicked: acc.clicked + row.clicked_count,
        failed: acc.failed + row.failed_count,
      }),
      { delivered: 0, opened: 0, clicked: 0, failed: 0 },
    );
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Email results overview
        </CardTitle>
        <CardDescription>
          Real delivery, open, and click data from tracked marketing sends. Inbox vs spam folder cannot be detected through SMTP — only actual recipient actions are shown here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Could not load email tracking data.</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No tracked email sends yet. Send a campaign to see results here.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="mt-1 text-2xl font-bold">{totals.delivered}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Opened</p>
                <p className="mt-1 text-2xl font-bold">{totals.opened}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Clicked links</p>
                <p className="mt-1 text-2xl font-bold">{totals.clicked}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className={cn('mt-1 text-2xl font-bold', totals.failed > 0 && 'text-red-600')}>{totals.failed}</p>
              </div>
            </div>

            <div className="space-y-3">
              {data.map((batch) => (
                <BatchOverviewRow key={`${batch.source_type}-${batch.source_id}`} batch={batch} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
