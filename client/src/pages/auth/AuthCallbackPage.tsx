import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { resetThemeForLogin } from '@/contexts/theme';
import { resetDisplayCurrencyForLogin } from '@/contexts/display-currency';
import { consumeAuthRedirect } from '@/lib/auth-redirect';
import { touchSessionActivity } from '@/lib/session-idle';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { commitSession } = useAuth();

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id) {
        resetThemeForLogin();
        resetDisplayCurrencyForLogin();
        touchSessionActivity();
        await commitSession(session);
        void supabase
          .from('activity_logs')
          .insert({
            user_id: session.user.id,
            action: 'signed_in',
            entity: 'auth',
            metadata: { provider: session.user.app_metadata?.provider ?? null },
          } as never)
          .then(() => undefined, () => undefined);
        navigate(consumeAuthRedirect('/marketplace'), { replace: true });
        return;
      }

      navigate('/login', { replace: true });
    }).catch(() => {
      navigate('/login', { replace: true });
    });
  }, [commitSession, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
