import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppContent } from '@/AppContent';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { DisplayCurrencyProvider } from '@/contexts/DisplayCurrencyContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { isGoogleSignInConfigured, loadGoogleScript } from '@/lib/google-auth';
import { initErrorBoundaryRecovery } from '@/lib/error-boundary-recovery';
import { initProductionDevtoolsGuard } from '@/lib/production-devtools-guard';
import './index.css';

initProductionDevtoolsGuard();
initErrorBoundaryRecovery();

if (isGoogleSignInConfigured()) {
  void loadGoogleScript();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <SiteContentProvider>
              <DisplayCurrencyProvider>
                <AppContent />
              </DisplayCurrencyProvider>
            </SiteContentProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
