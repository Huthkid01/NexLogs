export type ErrorReportSource = 'website_error' | 'login' | 'checkout' | 'dashboard' | 'other';

export interface ErrorReportRequest {
  title: string;
  message?: string;
  source?: ErrorReportSource;
  errorMessage?: string;
  reasonOptions?: string[];
}

const EVENT_NAME = 'nexlogs:error-report';

const DEFAULT_REASON_OPTIONS: Record<ErrorReportSource, string[]> = {
  website_error: ['Page not loading', 'Button not working', 'Unexpected popup', 'Other'],
  login: ['Wrong login details', 'Account access problem', 'Google sign-in problem', 'Other'],
  checkout: ['Insufficient funds', 'Wallet payment problem', 'Product purchase failed', 'Other'],
  dashboard: ['Page not loading', 'Data not showing', 'Action failed', 'Other'],
  other: ['General problem', 'Page issue', 'Payment issue', 'Other'],
};

const DEFAULT_USER_MESSAGES: Record<ErrorReportSource, string> = {
  website_error: 'Something went wrong on this page. Tell us what you were trying to do and select the closest reason below.',
  login: 'We could not complete your sign-in request. Select the reason that best matches what happened.',
  checkout: 'We could not complete this purchase or payment step. Select the reason that best matches what happened.',
  dashboard: 'Something went wrong in your dashboard. Select the reason that best matches what happened.',
  other: 'Something went wrong. Select the reason that best matches what happened.',
};

export function openErrorReport(request: ErrorReportRequest) {
  window.dispatchEvent(new CustomEvent<ErrorReportRequest>(EVENT_NAME, { detail: request }));
}

export function getErrorReportEventName() {
  return EVENT_NAME;
}

export function getDefaultErrorReasons(source: ErrorReportSource = 'website_error') {
  return DEFAULT_REASON_OPTIONS[source];
}

export function getFriendlyErrorMessage(source: ErrorReportSource = 'website_error') {
  return DEFAULT_USER_MESSAGES[source];
}
