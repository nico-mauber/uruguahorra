export type PaymentProvider = 'mercadopago';

export interface SubscriptionPlan {
  id: 'premium_monthly' | 'premium_yearly';
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  discount?: string;
  priceId: {
    mercadopago: string;
  };
}

export interface MercadoPagoPreapprovalOptions {
  reason: string;
  userId: string;
  autoRecurring: {
    frequency: number;
    frequency_type: 'months';
    transaction_amount: number;
    currency_id: 'USD' | 'UYU' | 'ARS';
    start_date: string;
    end_date: string;
  };
  back_url: string;
}

export interface CheckoutResult {
  url: string;
  preapprovalId: string;
}

// Webhooks
export interface MercadoPagoWebhookEvent {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: string;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

export interface SubscriptionMetadata {
  userId: string;
  plan: string;
}
