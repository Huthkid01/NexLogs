import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Eye,
  FileText,
  Link2,
  Maximize2,
  Minus,
  Package,
  Paperclip,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { BroadcastInlineProductSelector } from '@/components/admin/BroadcastInlineProductSelector';
import { BroadcastEmailPreview } from '@/components/admin/BroadcastEmailPreview';
import { BroadcastPreviewModal } from '@/components/admin/BroadcastPreviewModal';
import { EmailComposerModal } from '@/components/admin/EmailComposerModal';
import { BroadcastRecipientPicker, type BroadcastContact } from '@/components/admin/BroadcastRecipientPicker';
import { useBroadcastDeliverability } from '@/components/admin/BroadcastEmailPreview';
import { useEmailSenderState } from '@/contexts/EmailSenderStateContext';
import { useTheme } from '@/hooks/useTheme';
import { clearBroadcastDraft, saveBroadcastDraft } from '@/lib/broadcast-draft';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/constants';
import type { Product } from '@/types';

const DEFAULT_SUBJECT = `New products available on ${APP_NAME}`;
const FROM_ADDRESS = 'support@nexlogs.store';

const DEFAULT_ANNOUNCEMENT_MESSAGE =
  'We just added new products to the marketplace. Browse the list below and click any product to view details.';

export interface BroadcastComposerProps {
  contacts: BroadcastContact[];
  contactsLoading: boolean;
  products: Product[];
  productsLoading: boolean;
  subject: string;
  onSubjectChange: (value: string) => void;
  customMessage: string;
  onCustomMessageChange: (value: string) => void;
  selectedProductIds: string[];
  onSelectedProductIdsChange: (ids: string[]) => void;
  selectedRecipientIds: string[];
  onSelectedRecipientIdsChange: (ids: string[]) => void;
  selectedExternalEmails: string[];
  onSelectedExternalEmailsChange: (emails: string[]) => void;
  onSend: () => void;
  sending?: boolean;
  canSend: boolean;
}

export function BroadcastComposer({
  contacts,
  contactsLoading,
  products,
  productsLoading,
  subject,
  onSubjectChange,
  customMessage,
  onCustomMessageChange,
  selectedProductIds,
  onSelectedProductIdsChange,
  selectedRecipientIds,
  onSelectedRecipientIdsChange,
  selectedExternalEmails,
  onSelectedExternalEmailsChange,
  onSend,
  sending = false,
  canSend,
}: BroadcastComposerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { state, updateBroadcast, resetBroadcast } = useEmailSenderState();
  const { minimized, expanded, productsPanelOpen, previewInlineOpen } = state.broadcast;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  );

  const selectedProducts = useMemo(
    () => activeProducts.filter((product) => selectedProductIds.includes(product.id)),
    [activeProducts, selectedProductIds],
  );

  const deliverability = useBroadcastDeliverability(
    subject,
    customMessage,
    selectedProductIds.length,
  );

  const sendCount = selectedRecipientIds.length + selectedExternalEmails.length;

  const toggleProduct = (productId: string) => {
    onSelectedProductIdsChange(
      selectedProductIds.includes(productId)
        ? selectedProductIds.filter((id) => id !== productId)
        : [...selectedProductIds, productId],
    );
  };

  const selectRecentProducts = () => {
    onSelectedProductIdsChange(activeProducts.slice(0, 5).map((product) => product.id));
  };

  const handleSaveDraft = () => {
    const saved = saveBroadcastDraft({
      subject,
      customMessage,
      selectedProductIds,
      selectedRecipientIds,
      selectedExternalEmails,
    });
    setDraftSavedAt(saved.savedAt);
    toast.success('Draft saved');
  };

  const handleDiscard = () => {
    resetBroadcast();
    clearBroadcastDraft();
    setDraftSavedAt(null);
    toast.message('Draft discarded');
  };

  const handleClose = () => {
    updateBroadcast({ minimized: true });
  };

  const handlePreviewClick = () => {
    if (!selectedProducts.length) {
      updateBroadcast({ productsPanelOpen: true });
      toast.message('Select at least one product to preview the email.');
      return;
    }
    updateBroadcast({ previewInlineOpen: !previewInlineOpen });
  };

  const handlePreviewFullscreen = () => {
    if (!selectedProducts.length) {
      updateBroadcast({ productsPanelOpen: true });
      toast.message('Select at least one product to preview the email.');
      return;
    }
    setPreviewOpen(true);
  };

  const handleSendClick = () => {
    if (!sendCount) {
      toast.error('Add at least one recipient in the To field.');
      return;
    }
    if (!selectedProductIds.length) {
      toast.error('Select at least one product to include.');
      return;
    }
    if (!deliverability.canSend) {
      toast.error('Fix the failed inbox checks before sending.');
      return;
    }
    onSend();
  };

  return (
    <>
      <div className="flex w-full justify-start">
        <button
          type="button"
          onClick={() => updateBroadcast({ minimized: false })}
          className={cn(
            'flex w-full max-w-2xl items-center justify-between rounded-xl border px-4 py-3 text-left shadow-lg transition hover:shadow-xl',
            isDark ? 'border-[#22324a] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
            !minimized && 'ring-2 ring-violet-500/40',
          )}
        >
          <span className="truncate text-sm font-medium">
            New message — {subject || DEFAULT_SUBJECT}
          </span>
          <Maximize2 className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>

      <EmailComposerModal
        open={!minimized}
        onClose={handleClose}
        isDark={isDark}
        className={expanded ? 'max-w-[min(96vw,1200px)]' : undefined}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-100 dark:border-[#18263b]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">New message</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateBroadcast({ minimized: true })}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#06101d] dark:hover:text-slate-200"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateBroadcast({ expanded: !expanded })}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
          <span className="w-14 shrink-0 text-sm text-slate-500">From</span>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 text-sm"
            disabled
          >
            <span className="truncate">{FROM_ADDRESS}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>

        <BroadcastRecipientPicker
          contacts={contacts}
          selectedIds={selectedRecipientIds}
          onChange={onSelectedRecipientIdsChange}
          selectedExternalEmails={selectedExternalEmails}
          onExternalEmailsChange={onSelectedExternalEmailsChange}
          loading={contactsLoading}
          variant="composer"
          showCcToggle
        />

        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
          <span className="w-14 shrink-0 text-sm text-slate-500">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={DEFAULT_SUBJECT}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <BroadcastInlineProductSelector
          open={productsPanelOpen}
          onToggleOpen={() => updateBroadcast({ productsPanelOpen: !productsPanelOpen })}
          products={activeProducts}
          selectedIds={selectedProductIds}
          onToggle={toggleProduct}
          onSelectRecent={selectRecentProducts}
          loading={productsLoading}
        />

        <div>
          <textarea
            value={customMessage}
            onChange={(event) => onCustomMessageChange(event.target.value)}
            placeholder={`Optional. e.g. "${DEFAULT_ANNOUNCEMENT_MESSAGE}"`}
            className="min-h-[120px] w-full resize-none bg-transparent px-4 py-4 text-sm leading-relaxed outline-none placeholder:text-slate-400"
          />

          {!deliverability.canSend && selectedProductIds.length > 0 && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
              Fix inbox placement issues before sending — open preview for details.
            </div>
          )}
        </div>

        {previewInlineOpen && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-[#18263b] dark:bg-[#06101d]/50">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Email preview</p>
              <button
                type="button"
                onClick={handlePreviewFullscreen}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                Open full screen
              </button>
            </div>
            <BroadcastEmailPreview
              subject={subject}
              customMessage={customMessage}
              products={selectedProducts.map((product) => ({
                title: product.title,
                slug: product.slug,
                price: product.price,
              }))}
            />
          </div>
        )}
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-[#18263b]">
          <div className="flex flex-wrap items-center gap-1">
            <div className="relative flex">
              <button
                type="button"
                disabled={sending || !canSend}
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
                      Save draft & close
                    </button>
                  </div>
                </>
              )}
            </div>

            <ToolbarIcon
              icon={Sparkles}
              label="Insert sample message"
              onClick={() => onCustomMessageChange(DEFAULT_ANNOUNCEMENT_MESSAGE)}
            />
            <ToolbarIcon icon={Type} label="Formatting" disabled title="Plain text announcement" />
            <ToolbarIcon icon={Paperclip} label="Attachments" disabled title="Not available for broadcasts" />
            <ToolbarIcon icon={Link2} label="Product links" disabled title="Added automatically for selected products" />

            <ToolbarIcon
              icon={Package}
              label="Select products"
              active={productsPanelOpen || selectedProductIds.length > 0}
              onClick={() => updateBroadcast({ productsPanelOpen: !productsPanelOpen })}
            />

            <ToolbarIcon
              icon={Eye}
              label="Preview email"
              active={previewInlineOpen}
              onClick={handlePreviewClick}
            />
            <ToolbarIcon
              icon={FileText}
              label="Deliverability checks"
              onClick={handlePreviewClick}
            />
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

      <BroadcastPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        subject={subject}
        customMessage={customMessage}
        products={selectedProducts.map((product) => ({
          title: product.title,
          slug: product.slug,
          price: product.price,
        }))}
      />
    </>
  );
}

function ToolbarIcon({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  title,
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={cn(
        'rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-[#06101d] dark:hover:text-slate-200',
        active && 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
