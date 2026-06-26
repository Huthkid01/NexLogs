import { useEffect, useRef } from 'react';
import { getGoogleClientId, loadGoogleScript } from '@/lib/google-auth';
import { cn } from '@/lib/utils';

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
  className,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !container) return;

        container.innerHTML = '';
        window.google!.accounts.id.initialize({
          client_id: getGoogleClientId(),
          callback: (response) => {
            if (response.credential) {
              void onCredential(response.credential);
              return;
            }
            onError?.(new Error('Google sign-in was cancelled'));
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          ux_mode: 'popup',
        });

        const width = Math.max(container.offsetWidth || 0, 280);
        window.google!.accounts.id.renderButton(container, {
          type: 'standard',
          size: 'large',
          theme: 'outline',
          text: 'continue_with',
          shape: 'rectangular',
          width,
        });
      })
      .catch((error: unknown) => {
        onError?.(error instanceof Error ? error : new Error('Failed to load Google sign-in'));
      });

    return () => {
      cancelled = true;
      window.google?.accounts.id.cancel();
    };
  }, [disabled, onCredential, onError]);

  return (
    <div
      ref={containerRef}
      className={cn('flex min-h-11 w-full items-center justify-center', className)}
      aria-label="Sign in with Google"
    />
  );
}
