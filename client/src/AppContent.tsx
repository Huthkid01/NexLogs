import { useAuth } from '@/contexts/AuthContext';
import { SessionIdleGuard } from '@/components/auth/SessionIdleGuard';
import { AppLoader } from '@/components/common/AppLoader';
import { AppToaster } from '@/components/common/AppToaster';
import { AppRouter } from '@/routes';

export function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <AppLoader fullScreen />;
  }

  return (
    <>
      <SessionIdleGuard />
      <AppRouter />
      <AppToaster />
    </>
  );
}
