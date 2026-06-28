import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, ShieldCheck } from 'lucide-react';
import { buildBroadcastEmailPreview } from '@/lib/broadcast-email-template';
import {
  runDeliverabilityChecks,
  type DeliverabilityCheck,
} from '@/lib/broadcast-email-deliverability';
import { cn } from '@/lib/utils';

interface BroadcastEmailPreviewProps {
  subject: string;
  customMessage: string;
  products: Array<{ title: string; slug: string; price: number }>;
}

function CheckRow({ check }: { check: DeliverabilityCheck }) {
  const Icon =
    check.level === 'pass' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon
        className={cn(
          'h-4 w-4 mt-0.5 shrink-0',
          check.level === 'pass' && 'text-emerald-500',
          check.level === 'warn' && 'text-amber-500',
          check.level === 'fail' && 'text-red-500',
        )}
      />
      <div>
        <p className="font-medium">{check.title}</p>
        <p className="text-xs text-muted-foreground">{check.detail}</p>
      </div>
    </div>
  );
}

export function BroadcastEmailPreview({
  subject,
  customMessage,
  products,
}: BroadcastEmailPreviewProps) {
  const preview = useMemo(
    () =>
      buildBroadcastEmailPreview({
        subject,
        customMessage,
        products,
      }),
    [subject, customMessage, products],
  );

  const deliverability = useMemo(
    () =>
      runDeliverabilityChecks({
        subject,
        customMessage,
        productCount: products.length,
      }),
    [subject, customMessage, products.length],
  );

  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
        Select products to preview how the email will look in a user inbox.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-[#f26522]" />
          <p className="text-sm font-semibold">Inbox preview</p>
        </div>

        <div className="rounded-xl border border-border bg-white dark:bg-slate-950 overflow-hidden">
          <div className="border-b border-border bg-slate-50 dark:bg-slate-900 px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-sm font-medium truncate">{preview.fromLabel}</p>
            <p className="text-xs text-muted-foreground pt-2">Subject</p>
            <p className="text-sm font-semibold truncate">{preview.subject}</p>
            <p className="text-xs text-muted-foreground pt-2">Inbox snippet</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{preview.preheader}</p>
          </div>

          <iframe
            title="Email body preview"
            srcDoc={preview.html}
            className="w-full h-[420px] border-0 bg-[#f4f6f8]"
            sandbox=""
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-semibold">Inbox placement checks</p>
        </div>

        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            deliverability.canSend
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100',
          )}
        >
          {deliverability.canSend
            ? 'Ready to send. These checks reduce spam risk but cannot guarantee inbox placement.'
            : 'Fix the failed checks below before sending.'}
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3 max-h-[420px] overflow-y-auto">
          {deliverability.checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function useBroadcastDeliverability(
  subject: string,
  customMessage: string,
  productCount: number,
) {
  return useMemo(
    () =>
      runDeliverabilityChecks({
        subject,
        customMessage,
        productCount,
      }),
    [subject, customMessage, productCount],
  );
}
