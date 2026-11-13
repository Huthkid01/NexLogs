const ERROR_BOUNDARY_KEY = 'nexlogs_error_boundary_active';
const AUTO_RECOVERED_KEY = 'nexlogs_error_boundary_auto_recovered';
const CHUNK_RELOAD_KEY = 'nexlogs_chunk_load_reloaded';
const HEALTHY_BOOT_DELAY_MS = 10_000;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : String((error as { message?: unknown } | null | undefined)?.message ?? error ?? '');
}

/** Stale JS chunks after a deploy (Safari/Chrome/Firefox wording). */
export function isChunkLoadError(error: unknown): boolean {
  const message = errorMessage(error);

  return /importing a module script failed/i.test(message)
    || /failed to fetch dynamically imported module/i.test(message)
    || /error loading dynamically imported module/i.test(message)
    || /loading chunk [\w-]+ failed/i.test(message)
    || /chunkloaderror/i.test(message)
    // React.lazy fallout when a chunk import fails mid-load.
    || /_result\.default/i.test(message);
}

/**
 * Mixed old/new bundles after a deploy can duplicate the AuthContext module,
 * so useAuth sees no provider even though AuthProvider is mounted.
 */
export function isAuthProviderSkewError(error: unknown): boolean {
  return /useAuth must be used within AuthProvider/i.test(errorMessage(error));
}

export function markErrorBoundaryActive() {
  try {
    sessionStorage.setItem(ERROR_BOUNDARY_KEY, '1');
  } catch {
    // ignore storage failures
  }
}

export function clearErrorBoundaryActive() {
  try {
    sessionStorage.removeItem(ERROR_BOUNDARY_KEY);
  } catch {
    // ignore storage failures
  }
}

export function isErrorBoundaryActive() {
  try {
    return sessionStorage.getItem(ERROR_BOUNDARY_KEY) === '1';
  } catch {
    return false;
  }
}

function clearAutoRecovered() {
  try {
    sessionStorage.removeItem(AUTO_RECOVERED_KEY);
  } catch {
    // ignore
  }
}

function takeAutoRecoverSlot(): boolean {
  try {
    if (sessionStorage.getItem(AUTO_RECOVERED_KEY) === '1') return false;
    sessionStorage.setItem(AUTO_RECOVERED_KEY, '1');
    return true;
  } catch {
    return true;
  }
}

/**
 * Clears the one-shot auto-recover guard after a healthy boot so a later
 * tab-resume crash can recover once again.
 */
export function clearErrorBoundaryAutoRecover() {
  clearAutoRecovered();
}

/**
 * Reloads once when Safari/Chrome restores a frozen crash UI from bfcache
 * or a transient resume error. Avoids leaving users on "Something went wrong"
 * until they manually refresh.
 */
export function initErrorBoundaryRecovery() {
  // Keep the guard through startup: if the same error survives a reload,
  // render the fallback instead of entering a reload loop. Re-arm only after
  // the app has remained alive long enough to count as a healthy boot.
  window.setTimeout(clearErrorBoundaryAutoRecover, HEALTHY_BOOT_DELAY_MS);

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !isErrorBoundaryActive()) return;
    clearErrorBoundaryActive();
    window.location.reload();
  });
}

/** One automatic reload after a crash while the tab is visible (resume glitches). */
export function tryAutoRecoverFromError(): boolean {
  if (!takeAutoRecoverSlot()) return false;
  clearErrorBoundaryActive();
  window.location.reload();
  return true;
}

function takeChunkReloadSlot(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    return true;
  } catch {
    return true;
  }
}

function clearChunkReloadGuard() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // ignore
  }
}

/** One hard reload when a lazy route/chunk is missing after a new deploy. */
export function tryReloadForChunkLoadError(error?: unknown): boolean {
  if (error !== undefined && !isChunkLoadError(error) && !isAuthProviderSkewError(error)) {
    return false;
  }
  if (!takeChunkReloadSlot()) return false;
  window.location.reload();
  return true;
}

/**
 * Recovers from Vite/React lazy-import failures after deploys.
 * Without this, users on an old tab hit "Importing a module script failed".
 */
export function initChunkLoadRecovery() {
  window.setTimeout(clearChunkReloadGuard, HEALTHY_BOOT_DELAY_MS);

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    tryReloadForChunkLoadError();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    tryReloadForChunkLoadError(event.reason);
  });
}
