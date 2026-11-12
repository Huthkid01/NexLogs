import './instrument';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppContent } from '@/AppContent';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { DisplayCurrencyProvider } from '@/contexts/DisplayCurrencyContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { isGoogleSignInConfigured, loadGoogleScript } from '@/lib/google-auth';
import { initChunkLoadRecovery, initErrorBoundaryRecovery } from '@/lib/error-boundary-recovery';
import { initProductionDevtoolsGuard } from '@/lib/production-devtools-guard';
import { CACHE_TIMES } from '@/lib/query-cache';
import './index.css';

initProductionDevtoolsGuard();
initErrorBoundaryRecovery();
initChunkLoadRecovery();

if (isGoogleSignInConfigured()) {
  void loadGoogleScript();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.defaultStaleMs,
      gcTime: CACHE_TIMES.gcMs,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
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
