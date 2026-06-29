import { useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';

export function useModalLock(open: boolean, onClose: () => void) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);
}
