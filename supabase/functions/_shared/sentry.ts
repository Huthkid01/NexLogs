/**
 * Sentry helper for Supabase Edge Functions (Deno).
 * No-ops when SENTRY_DSN is unset so local/dev keeps working.
 */
// Prefer bare specifier via deno.json import map (keeps IDE/Deno lint clean).
import * as Sentry from '@sentry/deno';

let initialized = false;

export function initEdgeSentry(functionName: string) {
  if (initialized) return;
  initialized = true;

  const dsn = Deno.env.get('SENTRY_DSN')?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    defaultIntegrations: false,
    environment: Deno.env.get('SENTRY_ENVIRONMENT')?.trim() || 'production',
    tracesSampleRate: 0.2,
  });

  Sentry.setTag('function', functionName);
  const region = Deno.env.get('SB_REGION');
  if (region) Sentry.setTag('region', region);
  const executionId = Deno.env.get('SB_EXECUTION_ID');
  if (executionId) Sentry.setTag('execution_id', executionId);
}

export async function captureEdgeException(
  error: unknown,
  extras?: Record<string, unknown>,
) {
  if (!Deno.env.get('SENTRY_DSN')?.trim()) return;

  Sentry.withScope((scope: Sentry.Scope) => {
    if (extras) scope.setExtras(extras);
    Sentry.captureException(error);
  });
  await Sentry.flush(2000);
}
