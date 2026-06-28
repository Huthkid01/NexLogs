import { authService } from '@/services/auth.service';
import { resetThemeForLogin } from '@/contexts/theme';
import { resetDisplayCurrencyForLogin } from '@/contexts/display-currency';
import { consumeAuthRedirect } from '@/lib/auth-redirect';

/** Exchange Google ID token for a Supabase session, then redirect to the intended page. */
export async function completeGoogleAuth(idToken: string): Promise<void> {
  await authService.signInWithGoogle(idToken);
  resetThemeForLogin();
  resetDisplayCurrencyForLogin();
  window.location.replace(consumeAuthRedirect('/marketplace'));
}
