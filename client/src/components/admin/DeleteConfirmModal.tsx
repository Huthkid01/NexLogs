import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  open,
  title = 'Delete item',
  message,
  confirmLabel = 'Yes',
  loading = false,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020817]/75 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close delete confirmation"
      />

      <div className="admin-panel relative z-10 w-full max-w-md rounded-[1.5rem] border-[#1f2e46] bg-[#081324] text-slate-100">
        <div className="flex items-start justify-between gap-4 border-b border-[#18263b] px-6 py-5">
          <div>
            <h2 className="admin-heading text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-slate-400">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#22324a] bg-[#0a1628] text-slate-400 hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-[#22324a] bg-[#081624] text-slate-100 hover:bg-[#10213a]"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
