import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { AccountDetails } from '@/lib/account-details';

interface AccountDetailsModalProps {
  title: string;
  details: AccountDetails | null;
  open: boolean;
  onClose: () => void;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function AccountDetailsModal({ title, details, open, onClose }: AccountDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
      setCopiedField(null);
      setCopiedAll(false);
    };
  }, [open, onClose]);

  if (!open || !details) return null;

  const handleCopy = async (label: string, value: string) => {
    try {
      await copyText(value);
      setCopiedField(label);
      setCopiedAll(false);
      toast.success(`${label} copied`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyAll = async () => {
    try {
      await copyText(details.fullCredentials);
      setCopiedAll(true);
      setCopiedField(null);
      toast.success('All account details copied');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-details-title"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-300">
          <div>
            <h2
              id="account-details-title"
              className="text-base sm:text-lg font-bold text-gray-900 uppercase leading-snug pr-4"
            >
              Account Details
            </h2>
            <p className="text-xs text-gray-500 mt-1">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 p-0.5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-3">
          {details.fields.map((field) => (
            <div key={field.label} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                    {field.label}
                  </p>
                  <p className="text-sm font-mono text-gray-900 break-all">{field.value}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(field.label, field.value)}
                  className="shrink-0 p-2 text-gray-500 hover:text-[#f26522] rounded-md hover:bg-gray-50"
                  aria-label={`Copy ${field.label}`}
                >
                  {copiedField === field.label ? (
                    <Check className="h-4 w-4 text-[#1b5e20]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
              Full Credentials
            </p>
            <p className="text-sm font-mono text-gray-900 break-all">{details.fullCredentials}</p>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="w-full mt-2 py-2.5 text-sm font-medium bg-[#f26522] text-white rounded-md hover:bg-[#d94e0f] transition-colors"
          >
            {copiedAll ? 'Copied!' : 'Copy All Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
