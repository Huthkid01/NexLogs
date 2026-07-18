import type { ReactNode } from 'react';
import { adminModalOverlayClass } from '@/lib/admin-theme';
import { useModalLock } from '@/hooks/useModalLock';
import { cn } from '@/lib/utils';

interface EmailComposerModalProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  children: ReactNode;
  className?: string;
}

export function EmailComposerModal({
  open,
  onClose,
  isDark,
  children,
  className,
}: EmailComposerModalProps) {
  useModalLock(open, onClose);

  if (!open) return null;

  return (
    <div className={adminModalOverlayClass(isDark, 'z-[80]')}>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close composer" />

      <div
        className={cn(
          'relative z-10 flex h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.35rem] border shadow-2xl',
          isDark
            ? 'border-[#1f2e46] bg-[#0b1628] text-slate-100'
            : 'border-slate-200/90 bg-white text-slate-900',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
