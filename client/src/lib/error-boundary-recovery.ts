const ERROR_BOUNDARY_KEY = 'nexlogs_error_boundary_active';
const AUTO_RECOVERED_KEY = 'nexlogs_error_boundary_auto_recovered';
const HEALTHY_BOOT_DELAY_MS = 10_000;

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
