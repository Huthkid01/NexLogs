import { useMemo, useState } from 'react';
import { Check, FileText, Inbox, Sparkles, X } from 'lucide-react';
import {
  HTML_CAMPAIGN_TEMPLATE_CATEGORIES,
  HTML_CAMPAIGN_TEMPLATES,
  type HtmlCampaignTemplate,
} from '@/lib/html-campaign-templates';
import {
  adminIconButtonClass,
  adminModalClass,
  adminModalOverlayClass,
  adminMutedTextClass,
} from '@/lib/admin-theme';
import { useModalLock } from '@/hooks/useModalLock';
import { cn } from '@/lib/utils';

interface HtmlTemplatePickerModalProps {
  open: boolean;
  isDark: boolean;
  selectedTemplateId: string;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export function HtmlTemplatePickerModal({
  open,
  isDark,
  selectedTemplateId,
  onClose,
  onSelect,
}: HtmlTemplatePickerModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('account');
  useModalLock(open, onClose);

  const templates = useMemo(
    () =>
      HTML_CAMPAIGN_TEMPLATES.filter((template) => template.category === activeCategory),
    [activeCategory],
  );

  if (!open) return null;

  return (
    <div className={adminModalOverlayClass(isDark, 'z-[95]')}>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close templates" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-gallery-title"
        className={cn(adminModalClass(isDark), 'relative z-10 flex max-h-[min(90vh,720px)] max-w-3xl flex-col')}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6',
            isDark ? 'border-[#18263b]' : 'border-slate-200',
          )}
        >
          <div>
            <h2 id="template-gallery-title" className="text-lg font-semibold tracking-tight">
              Choose a template
            </h2>
            <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
              Prefer <strong>Account → inbox-friendly</strong> templates for Primary inbox placement.
            </p>
          </div>
          <button type="button" onClick={onClose} className={adminIconButtonClass(isDark)} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn('flex gap-2 overflow-x-auto border-b px-5 py-3 sm:px-6', isDark ? 'border-[#18263b]' : 'border-slate-100')}>
          {HTML_CAMPAIGN_TEMPLATE_CATEGORIES.map((category) => {
            const active = category.id === activeCategory;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                  active
                    ? 'bg-[#f26522] text-white'
                    : isDark
                      ? 'bg-[#06111f] text-slate-300 hover:bg-[#132038]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 sm:px-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selected={template.id === selectedTemplateId}
              isDark={isDark}
              onSelect={() => onSelect(template.id)}
            />
          ))}
          {!templates.length && (
            <p className={cn('py-10 text-center text-sm', adminMutedTextClass(isDark))}>
              No templates in this category yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  isDark,
  onSelect,
}: {
  template: HtmlCampaignTemplate;
  selected: boolean;
  isDark: boolean;
  onSelect: () => void;
}) {
  const inboxFriendly = /inbox-friendly/i.test(template.name) || /inbox-friendly/i.test(template.description ?? '');

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition',
        selected
          ? 'border-[#f26522]/50 bg-orange-50/80 dark:border-[#f26522]/40 dark:bg-[#1a1208]'
          : isDark
            ? 'border-[#22324a] bg-[#06111f] hover:border-[#f26522]/35'
            : 'border-slate-200 bg-white hover:border-[#f26522]/40 hover:shadow-sm',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          inboxFriendly
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
            : isDark
              ? 'bg-[#132038] text-slate-300'
              : 'bg-slate-100 text-slate-600',
        )}
      >
        {inboxFriendly ? <Inbox className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">{template.name}</p>
          {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f26522]" />}
        </div>
        {template.description && (
          <p className={cn('mt-1 text-xs leading-5', adminMutedTextClass(isDark))}>{template.description}</p>
        )}
        {inboxFriendly && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Sparkles className="h-3 w-3" />
            Best for Primary inbox
          </span>
        )}
      </div>
    </button>
  );
}
