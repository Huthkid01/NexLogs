export interface FlutterwaveCheckoutResponse {
  status: 'successful' | 'cancelled' | 'failed';
  transaction_id: number;
  tx_ref: string;
}

export interface FlutterwaveCheckoutConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options?: string;
  redirect_url?: string;
  customer: {
    email: string;
    name?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  callback: (response: FlutterwaveCheckoutResponse) => void;
  onclose: () => void;
}

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: FlutterwaveCheckoutConfig) => void;
  }
}

export {};
