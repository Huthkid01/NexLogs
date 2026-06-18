import { useAuth } from '@/contexts/AuthContext';
import { AppLoader } from '@/components/common/AppLoader';
import { AppToaster } from '@/components/common/AppToaster';
import { ErrorReportCenter } from '@/components/common/ErrorReportCenter';
import { AppRouter } from '@/routes';

export function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <AppLoader fullScreen />;
  }

  return (
    <>
      <AppRouter />
      <AppToaster />
      <ErrorReportCenter />
    </>
  );
}
