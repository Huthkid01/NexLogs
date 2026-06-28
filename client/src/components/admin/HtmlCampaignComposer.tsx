import { useMemo, useState } from 'react';
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
import { BroadcastRecipientPicker, type BroadcastContact } from '@/components/admin/BroadcastRecipientPicker';
import {
  HtmlCampaignEmailPreview,
  useHtmlCampaignDeliverability,
} from '@/components/admin/HtmlCampaignEmailPreview';
import { EmailComposerModal } from '@/components/admin/EmailComposerModal';
import { useEmailSenderState } from '@/contexts/EmailSenderStateContext';
import { useTheme } from '@/hooks/useTheme';
import {
  clearHtmlCampaignDraft,
  saveHtmlCampaignDraft,
} from '@/lib/html-campaign-draft';
import {
  DEFAULT_HTML_CAMPAIGN_SUBJECT,
  HTML_CAMPAIGN_TEMPLATES,
  WELCOME_CAMPAIGN_SUBJECT,
} from '@/lib/html-campaign-templates';
import { cn } from '@/lib/utils';

const FROM_ADDRESS = 'support@nexlogs.store';

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
  onSend: () => void;
  sending?: boolean;
  canSend: boolean;
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
  onSend,
  sending = false,
  canSend,
}: HtmlCampaignComposerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { state, updateHtmlCampaign, resetHtmlCampaign } = useEmailSenderState();
  const { minimized, expanded, previewExpanded, previewInlineOpen } = state.htmlCampaign;

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const sendCount = selectedRecipientIds.length;
  const deliverability = useHtmlCampaignDeliverability(subject, htmlBody, sendCount);
  const selectedTemplate = useMemo(
    () => HTML_CAMPAIGN_TEMPLATES.find((template) => template.id === templateName),
    [templateName],
  );

  const handleSaveDraft = () => {
    const saved = saveHtmlCampaignDraft({
      subject,
      htmlBody,
      templateName,
      selectedRecipientIds,
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

  const applyTemplate = (templateId: string) => {
    const template = HTML_CAMPAIGN_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    onTemplateNameChange(template.id);
    onHtmlBodyChange(template.html);
    if (template.id === 'welcome-message') {
      onSubjectChange(WELCOME_CAMPAIGN_SUBJECT);
    }
    setTemplateMenuOpen(false);
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleSendClick = () => {
    if (!canSend) {
      if (!selectedRecipientIds.length) toast.error('Add at least one recipient in the To field.');
      else if (!htmlBody.trim()) toast.error('Add HTML content before sending.');
      else if (!subject.trim()) toast.error('Add a subject before sending.');
      else if (!deliverability.canSend) toast.error('Fix the failed inbox checks before sending.');
      return;
    }
    onSend();
  };

  return (
    <>
      <div className="flex w-full justify-start">
        <button
          type="button"
          onClick={() => updateHtmlCampaign({ minimized: false })}
          className={cn(
            'flex w-full max-w-2xl items-center justify-between rounded-xl border px-4 py-3 text-left shadow-lg transition hover:shadow-xl',
            isDark ? 'border-[#22324a] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
            !minimized && 'ring-2 ring-violet-500/40',
          )}
        >
          <span className="truncate text-sm font-medium">
            HTML campaign — {subject || DEFAULT_HTML_CAMPAIGN_SUBJECT}
          </span>
          <Maximize2 className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>

      <EmailComposerModal
        open={!minimized}
        onClose={handleClose}
        isDark={isDark}
        className={expanded || previewExpanded ? 'max-w-[min(96vw,1200px)]' : undefined}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-100 dark:border-[#18263b]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">HTML campaign</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateHtmlCampaign({ minimized: true })}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateHtmlCampaign({ expanded: !expanded })}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label={expanded ? 'Restore size' : 'Maximize'}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>

        <div className="flex min-h-0 shrink-0 flex-col border-b border-slate-100 dark:border-[#18263b]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
          <span className="w-14 shrink-0 text-sm text-slate-500">From</span>
          <span className="text-sm">{FROM_ADDRESS}</span>
        </div>

        <BroadcastRecipientPicker
          contacts={contacts}
          selectedIds={selectedRecipientIds}
          onChange={onSelectedRecipientIdsChange}
          loading={contactsLoading}
          variant="composer"
        />

        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
          <span className="w-14 shrink-0 text-sm text-slate-500">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={DEFAULT_HTML_CAMPAIGN_SUBJECT}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-2">
          <span className="w-14 shrink-0 text-sm text-slate-500">Template</span>
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setTemplateMenuOpen((value) => !value)}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
            >
              <FileText className="h-4 w-4" />
              {selectedTemplate?.name ?? 'Choose template'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', templateMenuOpen && 'rotate-180')} />
            </button>
            {templateMenuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10" onClick={() => setTemplateMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-[#22324a] dark:bg-[#0b1628]">
                  {HTML_CAMPAIGN_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#06101d]',
                        template.id === templateName && 'text-violet-600 dark:text-violet-400',
                      )}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
                className="text-xs font-medium text-violet-400 hover:underline"
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Inbox placement checks</p>
              <button
                type="button"
                onClick={() => updateHtmlCampaign({ previewInlineOpen: false })}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                Hide
              </button>
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
                disabled={sending}
                onClick={handleSendClick}
                className="inline-flex h-9 items-center rounded-l-full bg-[#7c3aed] px-5 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setSendMenuOpen((value) => !value)}
                className="inline-flex h-9 items-center rounded-r-full border-l border-violet-500 bg-[#7c3aed] px-2 text-white hover:bg-[#6d28d9] disabled:opacity-50"
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
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
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
    </>
  );
}
