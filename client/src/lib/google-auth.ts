const GOOGLE_GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

export function getGoogleClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error('GOOGLE_SIGNIN_NOT_CONFIGURED');
  }
  return clientId;
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}

export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_GIS_SCRIPT}"]`);
      if (existing) {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_GIS_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google sign-in'));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}
