import { authService } from '@/services/auth.service';
import { resetThemeForLogin } from '@/contexts/theme';

export const GOOGLE_SIGN_IN_DESTINATION = '/marketplace';

/** Exchange Google ID token for a Supabase session, then go straight to marketplace. */
export async function completeGoogleAuth(idToken: string): Promise<void> {
  await authService.signInWithGoogle(idToken);
  resetThemeForLogin();
  window.location.replace(GOOGLE_SIGN_IN_DESTINATION);
}
