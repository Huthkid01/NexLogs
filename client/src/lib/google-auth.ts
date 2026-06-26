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

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_GIS_SCRIPT}"]`);
      if (existing) {
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

function clickHiddenGoogleButton(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);

    const cleanup = () => {
      window.google?.accounts.id.cancel();
      container.remove();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google sign-in timed out'));
    }, 120_000);

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        window.clearTimeout(timeout);
        cleanup();
        if (response.credential) {
          resolve(response.credential);
          return;
        }
        reject(new Error('Google sign-in was cancelled'));
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
    });

    window.google!.accounts.id.renderButton(container, {
      type: 'standard',
      size: 'large',
      text: 'continue_with',
      width: 320,
    });

    window.requestAnimationFrame(() => {
      const button = container.querySelector<HTMLElement>('[role="button"]');
      if (!button) {
        window.clearTimeout(timeout);
        cleanup();
        reject(new Error('Google sign-in is unavailable'));
        return;
      }
      button.click();
    });
  });
}

export async function requestGoogleIdToken(): Promise<string> {
  const clientId = getGoogleClientId();
  await loadGoogleScript();

  if (!window.google?.accounts?.id) {
    throw new Error('Google sign-in is unavailable');
  }

  return clickHiddenGoogleButton(clientId);
}
