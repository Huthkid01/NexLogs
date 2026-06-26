interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GooglePromptMomentNotification {
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  ux_mode?: 'popup' | 'redirect';
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  prompt: (momentListener?: (notification: GooglePromptMomentNotification) => void) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number | boolean>) => void;
  cancel: () => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface Window {
  google?: {
    accounts: GoogleAccounts;
  };
}
