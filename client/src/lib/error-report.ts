import { toast } from 'sonner';

export type ErrorReportSource = 'website_error' | 'login' | 'checkout' | 'dashboard' | 'other';

export interface ErrorReportRequest {
  title: string;
  message?: string;
  source?: ErrorReportSource;
  errorMessage?: string;
  reasonOptions?: string[];
}

const DEFAULT_REASON_OPTIONS: Record<ErrorReportSource, string[]> = {
  website_error: ['Page not loading', 'Button not working', 'Unexpected popup', 'Other'],
  login: ['Wrong login details', 'Account access problem', 'Google sign-in problem', 'Other'],
  checkout: ['Insufficient funds', 'Wallet payment problem', 'Product purchase failed', 'Other'],
  dashboard: ['Page not loading', 'Data not showing', 'Action failed', 'Other'],
  other: ['General problem', 'Page issue', 'Payment issue', 'Other'],
};

const DEFAULT_USER_MESSAGES: Record<ErrorReportSource, string> = {
  website_error: 'Something went wrong. Please try again or contact customer support.',
  login: 'We could not complete your sign-in. Please try again or contact customer support.',
  checkout: 'Error while purchasing. Please try again or contact customer support.',
  dashboard: 'Something went wrong. Please try again or contact customer support.',
  other: 'Something went wrong. Please try again or contact customer support.',
};

/** Simple toast only — the old report-error modal is permanently disabled. */
export function openErrorReport(request: ErrorReportRequest) {
  const title = request.title?.trim() || 'Something went wrong';
  const message =
    request.message?.trim() ||
    getFriendlyErrorMessage(request.source ?? 'website_error');

  toast.error(title, {
    description: message,
    duration: 5_500,
  });
}

export function getErrorReportEventName() {
  return 'nexlogs:error-report';
}

export function getDefaultErrorReasons(source: ErrorReportSource = 'website_error') {
  return DEFAULT_REASON_OPTIONS[source];
}

export function getFriendlyErrorMessage(source: ErrorReportSource = 'website_error') {
  return DEFAULT_USER_MESSAGES[source];
}
