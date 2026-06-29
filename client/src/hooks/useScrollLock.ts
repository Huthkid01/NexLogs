import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;

  savedScrollY = window.scrollY;
  const { body } = document;
  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;

  const { body } = document;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflow = '';
  window.scrollTo(0, savedScrollY);
}

/** Locks page scroll — safe for nested modals and iOS Safari. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [active]);
}
