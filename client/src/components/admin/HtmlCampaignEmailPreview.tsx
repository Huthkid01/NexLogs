import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { runHtmlCampaignDeliverabilityChecks } from '@/lib/html-campaign-deliverability';
import type { DeliverabilityCheck } from '@/lib/broadcast-email-deliverability';
import { cn } from '@/lib/utils';

interface HtmlCampaignEmailPreviewProps {
  subject: string;
  htmlBody: string;
  recipientCount: number;
}

function CheckRow({ check }: { check: DeliverabilityCheck }) {
  const Icon = check.level === 'pass' ? CheckCircle2 : AlertTriangle;

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

export function HtmlCampaignEmailPreview({
  subject,
  htmlBody,
  recipientCount,
}: HtmlCampaignEmailPreviewProps) {
  const deliverability = useMemo(
    () =>
      runHtmlCampaignDeliverabilityChecks({
        subject,
        htmlBody,
        recipientCount,
      }),
    [subject, htmlBody, recipientCount],
  );

  if (!htmlBody.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Add HTML content or choose a template to run inbox placement checks.
      </div>
    );
  }

  return (
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

      <div className="max-h-[280px] space-y-3 overflow-y-auto rounded-xl border border-border p-4">
        {deliverability.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

export function useHtmlCampaignDeliverability(
  subject: string,
  htmlBody: string,
  recipientCount: number,
) {
  return useMemo(
    () =>
      runHtmlCampaignDeliverabilityChecks({
        subject,
        htmlBody,
        recipientCount,
      }),
    [subject, htmlBody, recipientCount],
  );
}
