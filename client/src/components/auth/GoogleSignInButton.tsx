import { useEffect, useRef } from 'react';
import { getGoogleClientId, loadGoogleScript } from '@/lib/google-auth';
import { cn } from '@/lib/utils';
import { AppLoader } from '@/components/common/AppLoader';

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  disabled?: boolean;
  processing?: boolean;
  className?: string;
}

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
  processing = false,
  className,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (disabled || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !container) return;
        if (!window.google?.accounts?.id) {
          onErrorRef.current?.(new Error('Google sign-in is unavailable right now.'));
          return;
        }

        container.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: getGoogleClientId(),
          callback: (response) => {
            if (response.credential) {
              void onCredentialRef.current(response.credential);
              return;
            }
            onErrorRef.current?.(new Error('Google sign-in was cancelled'));
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          ux_mode: 'popup',
          use_fedcm_for_prompt: false,
        });

        const width = Math.max(container.offsetWidth || 0, 280);
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          size: 'large',
          theme: 'outline',
          text: 'continue_with',
          shape: 'rectangular',
          width,
        });
      })
      .catch((error: unknown) => {
        onErrorRef.current?.(error instanceof Error ? error : new Error('Failed to load Google sign-in'));
      });

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={containerRef}
        className={cn(
          'flex min-h-11 w-full items-center justify-center',
          (disabled || processing) && 'pointer-events-none opacity-60'
        )}
        aria-label="Sign in with Google"
      />
      {processing ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/80 dark:bg-dm-bg/80">
          <AppLoader className="py-0" iconClassName="h-8" />
        </div>
      ) : null}
    </div>
  );
}
