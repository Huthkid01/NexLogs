/**
 * Light deterrent for casual DevTools / view-source on production.
 * Not real security — determined users can always bypass client-side checks.
 */
const PRODUCTION_HOSTS = new Set(['nexlogs.store', 'www.nexlogs.store']);

export function shouldGuardDevtools(): boolean {
  if (!import.meta.env.PROD) return false;
  return PRODUCTION_HOSTS.has(window.location.hostname);
}

function isDevtoolsShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  const { ctrlKey, metaKey, shiftKey, altKey } = event;
  const mod = ctrlKey || metaKey;

  if (key === 'f12') return true;
  if (mod && shiftKey && (key === 'i' || key === 'j' || key === 'c')) return true;
  if (mod && key === 'u') return true;
  if (mod && altKey && (key === 'i' || key === 'j' || key === 'c')) return true;

  return false;
}

export function initProductionDevtoolsGuard(): void {
  if (!shouldGuardDevtools()) return;

  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener('contextmenu', block);
  document.addEventListener('keydown', (event) => {
    if (isDevtoolsShortcut(event)) block(event);
  });
}
