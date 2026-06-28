import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, ShieldCheck } from 'lucide-react';
import {
  personalizeHtmlPreview,
  runHtmlCampaignDeliverabilityChecks,
} from '@/lib/html-campaign-deliverability';
import type { DeliverabilityCheck } from '@/lib/broadcast-email-deliverability';
import { cn } from '@/lib/utils';

const FROM_LABEL = 'Nexlogs <support@nexlogs.store>';
const SAMPLE_UNSUBSCRIBE_FOOTER = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
  <tr>
    <td style="font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
      You received this because you have an account on Nexlogs.<br/>
      <span style="color:#6b7280;text-decoration:underline;">Unsubscribe from promotional emails</span>
    </td>
  </tr>
</table>`;

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

function buildPreviewHtml(htmlBody: string) {
  const personalized = personalizeHtmlPreview(htmlBody);
  if (personalized.includes('</body>')) {
    return personalized.replace('</body>', `${SAMPLE_UNSUBSCRIBE_FOOTER}</body>`);
  }
  return `${personalized}${SAMPLE_UNSUBSCRIBE_FOOTER}`;
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

  const previewHtml = useMemo(() => buildPreviewHtml(htmlBody), [htmlBody]);

  if (!htmlBody.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Add HTML content or choose a template to preview inbox placement checks.
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

        <div className="overflow-hidden rounded-xl border border-border bg-white dark:bg-slate-950">
          <div className="space-y-1 border-b border-border bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="truncate text-sm font-medium">{FROM_LABEL}</p>
            <p className="pt-2 text-xs text-muted-foreground">Subject</p>
            <p className="truncate text-sm font-semibold">{deliverability.sanitizedSubject || subject}</p>
            <p className="pt-2 text-xs text-muted-foreground">Inbox snippet</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {deliverability.preheader || 'Preview of your HTML email content.'}
            </p>
          </div>

          <iframe
            title="HTML campaign body preview"
            srcDoc={previewHtml}
            className="h-[420px] w-full border-0 bg-[#f4f6f8]"
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

        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-border p-4">
          {deliverability.checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
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
