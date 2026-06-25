export interface KoraCheckoutSuccess {
  amount: string;
  reference: string;
  status: string;
}

export interface KoraCheckoutConfig {
  key: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
  };
  narration?: string;
  channels?: string[];
  default_channel?: string;
  metadata?: Record<string, string | number | boolean>;
  onSuccess?: (data: KoraCheckoutSuccess) => void;
  onFailed?: (data: KoraCheckoutSuccess) => void;
  onClose?: () => void;
  onPending?: () => void;
}

declare global {
  interface Window {
    Korapay?: {
      initialize: (config: KoraCheckoutConfig) => void;
      close: () => void;
    };
  }
}

export {};
