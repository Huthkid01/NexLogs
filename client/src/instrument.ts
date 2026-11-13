import * as Sentry from '@sentry/react';
import React from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (dsn) {
  const isProd = import.meta.env.PROD;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration(),
    ],
    // Full traces locally; keep production light.
    tracesSampleRate: isProd ? 0.1 : 1.0,
    // Only same-origin. Propagating Sentry `baggage`/`sentry-trace` to Supabase
    // Edge Functions breaks CORS preflight on any function not yet redeployed
    // with those headers allow-listed (Service 2 / fivesim was failing live).
    tracePropagationTargets: [/^\//],
    replaysSessionSampleRate: isProd ? 0.05 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Expected after deploys when an old tab loads a removed JS chunk; we auto-reload.
    ignoreErrors: [
      /Importing a module script failed/i,
      /Failed to fetch dynamically imported module/i,
      /error loading dynamically imported module/i,
      /Loading chunk [\w-]+ failed/i,
      /ChunkLoadError/i,
      /_result\.default/i,
      /useAuth must be used within AuthProvider/i,
      /Payment is still pending/i,
    ],
    beforeSend(event, hint) {
      const error = hint.originalException;
      const message = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(event.message || event.exception?.values?.[0]?.value || '');
      // Deploy race / stale tab — handled by auto-reload, not actionable alerts.
      if (/_result\.default|importing a module script failed|dynamically imported module|ChunkLoadError|useAuth must be used within AuthProvider/i.test(message)) {
        return null;
      }
      // Normal Kora state while payment settles — user already sees a toast.
      if (/still pending|payment_pending/i.test(message)) {
        return null;
      }
      return event;
    },
  });
}
