import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import {
  adminIconButtonClass,
  adminMutedTextClass,
  adminOutlineButtonClass,
} from '@/lib/admin-theme';
import { cn } from '@/lib/utils';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm', isDark ? 'bg-[#020817]/75' : 'bg-black/40')}>
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close delete confirmation"
      />

      <div className={cn(
        'admin-panel relative z-10 w-full max-w-md rounded-[1.5rem]',
        isDark ? 'border-[#1f2e46] text-slate-100' : 'border-slate-200 bg-white text-slate-900 shadow-xl',
      )}>
        <div className={cn('flex items-start justify-between gap-4 border-b px-6 py-5', isDark ? 'border-[#18263b]' : 'border-slate-200')}>
          <div>
            <h2 className="admin-heading text-2xl font-semibold">{title}</h2>
            <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={adminIconButtonClass(isDark)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={adminOutlineButtonClass(isDark)}
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
