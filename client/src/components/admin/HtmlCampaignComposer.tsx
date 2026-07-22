import { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Code2,
  Eye,
  FileText,
  Maximize2,
  Minus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BroadcastRecipientPicker,
  type BroadcastContact,
  type BroadcastRecipientPickerHandle,
  type BroadcastRecipientSelection,
} from '@/components/admin/BroadcastRecipientPicker';
import {
  HtmlCampaignEmailPreview,
  useHtmlCampaignDeliverability,
} from '@/components/admin/HtmlCampaignEmailPreview';
import { EmailComposeLauncher } from '@/components/admin/EmailComposeLauncher';
import { EmailComposerModal } from '@/components/admin/EmailComposerModal';
import { HtmlTemplatePickerModal } from '@/components/admin/HtmlTemplatePickerModal';
import { useEmailSenderState } from '@/contexts/EmailSenderStateContext';
import { useTheme } from '@/hooks/useTheme';
import {
  clearHtmlCampaignDraft,
  saveHtmlCampaignDraft,
} from '@/lib/html-campaign-draft';
import { runHtmlCampaignDeliverabilityChecks } from '@/lib/html-campaign-deliverability';
import {
  DEFAULT_HTML_CAMPAIGN_SUBJECT,
  HTML_CAMPAIGN_TEMPLATES,
} from '@/lib/html-campaign-templates';
import { cn } from '@/lib/utils';

const DEFAULT_FROM = 'support@nexlogs.site';

export interface HtmlCampaignComposerProps {
  contacts: BroadcastContact[];
  contactsLoading: boolean;
  subject: string;
  onSubjectChange: (value: string) => void;
  htmlBody: string;
  onHtmlBodyChange: (value: string) => void;
  templateName: string;
  onTemplateNameChange: (value: string) => void;
  selectedRecipientIds: string[];
  onSelectedRecipientIdsChange: (ids: string[]) => void;
  selectedExternalEmails: string[];
  onSelectedExternalEmailsChange: (emails: string[]) => void;
  onSend: () => void;
  onPrepareSend?: (selection: BroadcastRecipientSelection) => void;
  onRecipientCountChange?: (count: number) => void;
  sending?: boolean;
  canSend: boolean;
  fromName?: string;
  fromAddress?: string;
}

export function HtmlCampaignComposer({
  contacts,
  contactsLoading,
  subject,
  onSubjectChange,
  htmlBody,
  onHtmlBodyChange,
  templateName,
  onTemplateNameChange,
  selectedRecipientIds,
  onSelectedRecipientIdsChange,
  selectedExternalEmails,
  onSelectedExternalEmailsChange,
  onSend,
  onPrepareSend,
  onRecipientCountChange,
  sending = false,
  canSend,
  fromName = 'Nexlogs',
  fromAddress = DEFAULT_FROM,
}: HtmlCampaignComposerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { state, updateHtmlCampaign, resetHtmlCampaign } = useEmailSenderState();
  const { minimized, expanded, previewExpanded, previewInlineOpen } = state.htmlCampaign;

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const recipientPickerRef = useRef<BroadcastRecipientPickerHandle>(null);

  const sendCount = selectedRecipientIds.length + selectedExternalEmails.length;
  const deliverability = useHtmlCampaignDeliverability(subject, htmlBody, sendCount);
  const selectedTemplate = useMemo(
    () => HTML_CAMPAIGN_TEMPLATES.find((template) => template.id === templateName),
    [templateName],
  );
  const fromLabel = `${fromName} <${fromAddress}>`;
  const launcherMeta = [
    subject?.trim() || DEFAULT_HTML_CAMPAIGN_SUBJECT,
    selectedTemplate?.name,
    sendCount ? `${sendCount} recipient${sendCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleSaveDraft = () => {
    const saved = saveHtmlCampaignDraft({
      subject,
      htmlBody,
      templateName,
      selectedRecipientIds,
      selectedExternalEmails,
    });
    setDraftSavedAt(saved.savedAt);
    toast.success('HTML campaign draft saved');
  };

  const handleDiscard = () => {
    resetHtmlCampaign();
    clearHtmlCampaignDraft();
    setDraftSavedAt(null);
    toast.message('HTML campaign discarded');
  };

  const handleClose = () => {
    updateHtmlCampaign({ minimized: true });
  };

  const applySpamFilterToEditor = () => {
    const cleanedSubject = deliverability.sanitizedSubject;
    const cleanedHtml = deliverability.sanitizedHtml;
    const phrases = deliverability.filteredSpamPhrases ?? [];
    let changed = false;
    if (cleanedSubject && cleanedSubject !== subject) {
      onSubjectChange(cleanedSubject);
      changed = true;
    }
    if (cleanedHtml && cleanedHtml !== htmlBody) {
      onHtmlBodyChange(cleanedHtml);
      changed = true;
    }
    if (phrases.length || changed) {
      toast.success(
        phrases.length
          ? `Spam filter cleaned: ${phrases.slice(0, 4).join(', ')}${phrases.length > 4 ? '…' : ''}`
          : 'Email content cleaned for inbox delivery',
      );
    } else {
      toast.message('No spam trigger phrases found');
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = HTML_CAMPAIGN_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const cleaned = runHtmlCampaignDeliverabilityChecks({
      subject: template.defaultSubject || subject,
      htmlBody: template.html,
      recipientCount: Math.max(sendCount, 1),
    });
    onTemplateNameChange(template.id);
    onHtmlBodyChange(cleaned.sanitizedHtml || template.html);
    if (template.defaultSubject || cleaned.sanitizedSubject) {
      onSubjectChange(cleaned.sanitizedSubject || template.defaultSubject || subject);
    }
    setTemplateMenuOpen(false);
    if (cleaned.filteredSpamPhrases?.length) {
      toast.success(
        `Template "${template.name}" loaded — spam words filtered (${cleaned.filteredSpamPhrases.slice(0, 3).join(', ')})`,
      );
    } else {
      toast.success(`Template "${template.name}" loaded`);
    }
  };

  const handleSendClick = () => {
    const committed = recipientPickerRef.current?.commitPendingInput() ?? {
      userIds: selectedRecipientIds,
      externalEmails: selectedExternalEmails,
    };
    const count = committed.userIds.length + committed.externalEmails.length;

    if (!count) {
      toast.error('Add at least one recipient in the To field. Type an email and press Enter.');
      return;
    }
    if (!htmlBody.trim()) {
      toast.error('Add HTML content before sending.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Add a subject before sending.');
      return;
    }
    // Always apply spam filter into the editor before send so recipients get cleaned copy.
    if (deliverability.sanitizedSubject && deliverability.sanitizedSubject !== subject) {
      onSubjectChange(deliverability.sanitizedSubject);
    }
    if (deliverability.sanitizedHtml && deliverability.sanitizedHtml !== htmlBody) {
      onHtmlBodyChange(deliverability.sanitizedHtml);
    }
    if (!deliverability.canSend) {
      toast.error('Fix the failed inbox checks before sending.');
      return;
    }
    onPrepareSend?.(committed);
    onSend();
  };

  return (
    <>
      <EmailComposeLauncher
        title="HTML campaign"
        description="Write custom HTML or load an inbox-friendly Account template."
        meta={launcherMeta}
        icon={Code2}
        isDark={isDark}
        active={!minimized}
        accent="sky"
        onClick={() => updateHtmlCampaign({ minimized: false })}
      />

      <EmailComposerModal
        open={!minimized}
        onClose={handleClose}
        isDark={isDark}
        className={expanded || previewExpanded ? 'max-w-[min(96vw,1200px)]' : undefined}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-100 dark:border-[#18263b]">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">HTML campaign</h2>
            <p className="mt-0.5 text-xs text-slate-400">Custom template send</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateHtmlCampaign({ minimized: true })}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateHtmlCampaign({ expanded: !expanded })}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label={expanded ? 'Restore size' : 'Maximize'}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>

        <div className="flex min-h-0 shrink-0 flex-col border-b border-slate-100 dark:border-[#18263b]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-[#18263b]">
          <span className="w-14 shrink-0 text-sm text-slate-500">From</span>
          <span className="truncate text-sm font-medium">{fromLabel}</span>
        </div>

        <BroadcastRecipientPicker
          ref={recipientPickerRef}
          contacts={contacts}
          selectedIds={selectedRecipientIds}
          onChange={onSelectedRecipientIdsChange}
          selectedExternalEmails={selectedExternalEmails}
          onExternalEmailsChange={onSelectedExternalEmailsChange}
          onRecipientCountChange={onRecipientCountChange}
          loading={contactsLoading}
          variant="composer"
        />

        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-[#18263b]">
          <span className="w-14 shrink-0 text-sm text-slate-500">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={DEFAULT_HTML_CAMPAIGN_SUBJECT}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-14 shrink-0 text-sm text-slate-500">Template</span>
          <button
            type="button"
            onClick={() => setTemplateMenuOpen(true)}
            className="inline-flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-[#f26522]/40 hover:bg-orange-50 dark:border-[#22324a] dark:bg-[#06111f] dark:text-slate-200 dark:hover:border-[#f26522]/40"
          >
            <FileText className="h-4 w-4 shrink-0 text-[#f26522]" />
            <span className="truncate">{selectedTemplate?.name ?? 'Choose template'}</span>
          </button>
          <p className="hidden text-xs text-slate-500 sm:block">Use {'{{name}}'} for recipient name</p>
        </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-2 gap-0 lg:grid-cols-2 lg:grid-rows-1">
          <div className="flex min-h-0 flex-col border-b border-slate-100 dark:border-[#18263b] lg:border-b-0 lg:border-r">
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-[#18263b]">
              <Code2 className="h-3.5 w-3.5" />
              HTML editor
            </div>
            <textarea
              value={htmlBody}
              onChange={(event) => onHtmlBodyChange(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed outline-none"
              placeholder="Paste or write your HTML email template here..."
            />
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </div>
              <button
                type="button"
                onClick={() => updateHtmlCampaign({ previewExpanded: !previewExpanded })}
                className="text-xs font-medium text-primary hover:underline"
              >
                {previewExpanded ? 'Compact' : 'Expand'}
              </button>
            </div>
            <iframe
              title="HTML campaign preview"
              srcDoc={htmlBody || '<p style="font-family:sans-serif;padding:24px;color:#94a3b8;">HTML preview will appear here</p>'}
              className="min-h-0 flex-1 border-0 bg-[#f4f6f8]"
              sandbox=""
            />
          </div>
        </div>

        {!deliverability.canSend && htmlBody.trim() && (
          <div className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
            Fix inbox placement issues before sending — open inbox checks for details.
          </div>
        )}

        {previewInlineOpen && (
          <div className="max-h-[min(42vh,360px)] shrink-0 overflow-y-auto border-t border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-[#18263b] dark:bg-[#06101d]/50">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Inbox placement checks</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={applySpamFilterToEditor}
                  className="text-xs font-medium text-primary hover:underline dark:text-primary"
                >
                  Clean spam words
                </button>
                <button
                  type="button"
                  onClick={() => updateHtmlCampaign({ previewInlineOpen: false })}
                  className="text-xs font-medium text-primary hover:underline dark:text-primary"
                >
                  Hide
                </button>
              </div>
            </div>
            <HtmlCampaignEmailPreview
              subject={subject}
              htmlBody={htmlBody}
              recipientCount={sendCount}
            />
          </div>
        )}

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-[#18263b]">
          <div className="flex flex-wrap items-center gap-1">
            <div className="relative flex">
              <button
                type="button"
                disabled={sending || !canSend}
                onClick={handleSendClick}
                className="inline-flex h-9 items-center rounded-l-full bg-[#f26522] px-5 text-sm font-semibold text-white hover:bg-[#d94e0f] disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setSendMenuOpen((value) => !value)}
                className="inline-flex h-9 items-center rounded-r-full border-l border-primary bg-[#f26522] px-2 text-white hover:bg-[#d94e0f] disabled:opacity-50"
                aria-label="Send options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {sendMenuOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-10" onClick={() => setSendMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 z-20 mb-2 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#22324a] dark:bg-[#0b1628]">
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#06101d]"
                      onClick={() => {
                        setSendMenuOpen(false);
                        handleSendClick();
                      }}
                    >
                      Send to {sendCount || 0} recipient{sendCount === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#06101d]"
                      onClick={() => {
                        setSendMenuOpen(false);
                        handleSaveDraft();
                      }}
                    >
                      Save draft & minimize
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => updateHtmlCampaign({ previewInlineOpen: !previewInlineOpen })}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors',
                previewInlineOpen
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#06101d]',
              )}
              title="Inbox preview and placement checks"
            >
              <Eye className="h-4 w-4" />
              Inbox checks
            </button>
          </div>

          <div className="flex items-center gap-3">
            {draftSavedAt && (
              <span className="hidden text-xs text-slate-400 sm:inline">
                Saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-[#06101d]"
              aria-label="Discard draft"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
      </EmailComposerModal>

      <HtmlTemplatePickerModal
        open={templateMenuOpen}
        isDark={isDark}
        selectedTemplateId={templateName}
        onClose={() => setTemplateMenuOpen(false)}
        onSelect={applyTemplate}
      />
    </>
  );
}
