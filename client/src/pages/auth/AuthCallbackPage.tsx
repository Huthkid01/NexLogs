import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isMockMode } from '@/lib/mock-mode';
import { resetThemeForLogin } from '@/contexts/theme';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMockMode() && session?.user?.id) {
        resetThemeForLogin();
        supabase
          .from('activity_logs')
          .insert({
            user_id: session.user.id,
            action: 'signed_in',
            entity: 'auth',
            metadata: { provider: session.user.app_metadata?.provider ?? null },
          } as never)
          .then(() => undefined, () => undefined);
      }
      navigate(session ? '/' : '/login', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
