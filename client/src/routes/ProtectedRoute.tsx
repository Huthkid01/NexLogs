import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLoader } from '@/components/common/AppLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoader fullScreen />;
  }

  if (!user) {
    return <Navigate to={adminOnly ? '/admin/login' : '/login'} state={{ from: location }} replace />;
  }
  if (profile?.is_suspended) return <Navigate to="/suspended" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader fullScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminGuestRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoader fullScreen />;
  if (isAdmin) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    return <Navigate to={from?.startsWith('/admin') ? from : '/admin'} replace />;
  }

  return <>{children}</>;
}

export function AdminRedirectGate({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoader fullScreen />;
  if (isAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
