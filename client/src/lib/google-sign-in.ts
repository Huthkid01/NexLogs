import { authService } from '@/services/auth.service';
import { resetThemeForLogin } from '@/contexts/theme';
import { resetDisplayCurrencyForLogin } from '@/contexts/display-currency';

export const GOOGLE_SIGN_IN_DESTINATION = '/marketplace';

/** Exchange Google ID token for a Supabase session, then go straight to marketplace. */
export async function completeGoogleAuth(idToken: string): Promise<void> {
  await authService.signInWithGoogle(idToken);
  resetThemeForLogin();
  resetDisplayCurrencyForLogin();
  window.location.replace(GOOGLE_SIGN_IN_DESTINATION);
}
