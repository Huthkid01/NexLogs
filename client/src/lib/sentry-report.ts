import * as Sentry from '@sentry/react';

/** Report handled client errors that users already see as toasts (payments, etc.). */
export function reportClientException(
  error: unknown,
  context: {
    area: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
) {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.withScope((scope) => {
    scope.setTag('area', context.area);
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) scope.setExtras(context.extra);
    Sentry.captureException(error);
  });
}
