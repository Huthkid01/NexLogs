const memoryStore = new Map<string, string>();

function canUseStorage(type: 'localStorage' | 'sessionStorage') {
  try {
    const storage = window[type];
    const probe = '__nexlogs_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageGet(key: string): string | null {
  try {
    if (canUseStorage('localStorage')) {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    }
  } catch {
    // Safari private mode can throw on read in some versions.
  }

  try {
    if (canUseStorage('sessionStorage')) {
      const value = sessionStorage.getItem(key);
      if (value !== null) return value;
    }
  } catch {
    // Ignore and fall back to memory.
  }

  return memoryStore.get(key) ?? null;
}

/** Returns true when the value was persisted beyond the current page session. */
export function safeStorageSet(key: string, value: string): boolean {
  try {
    if (canUseStorage('localStorage')) {
      localStorage.setItem(key, value);
      memoryStore.set(key, value);
      return true;
    }
  } catch {
    // QuotaExceededError in Safari private browsing.
  }

  try {
    if (canUseStorage('sessionStorage')) {
      sessionStorage.setItem(key, value);
      memoryStore.set(key, value);
      return false;
    }
  } catch {
    // Ignore and fall back to memory.
  }

  memoryStore.set(key, value);
  return false;
}

export function safeStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }

  memoryStore.delete(key);
}
