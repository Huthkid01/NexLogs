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
    tracePropagationTargets: [
      /^\//,
      /^https:\/\/opmjctjzwkvwsxenddfi\.supabase\.co\/functions/,
    ],
    replaysSessionSampleRate: isProd ? 0.05 : 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
