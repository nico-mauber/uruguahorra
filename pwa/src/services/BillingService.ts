/**
 * Servicio de facturación (MercadoPago). Fuente: docs/features/billing/*,
 * docs/api/contracts-and-data-mapping §2.10, §4.1.
 * El cliente NUNCA escribe en `subscriptions` (webhooks/service_role). Sólo lee
 * el estado premium y dispara la creación del checkout vía Edge Function.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';

export type PlanType = 'monthly' | 'annual';

export interface SubscriptionPlan {
  id: string;
  type: PlanType;
  name: string;
  price: string;
  period: string;
  note?: string;
  badge?: string;
}

/** Planes mostrados en el paywall (montos reales de cobro en UYU). */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium_yearly',
    type: 'annual',
    name: 'Plan Anual',
    price: '$799',
    period: '/año',
    note: 'Equivale a ~$67/mes',
    badge: 'Ahorra 33%',
  },
  {
    id: 'premium_monthly',
    type: 'monthly',
    name: 'Plan Mensual',
    price: '$15',
    period: '/mes',
    note: 'Cancela cuando quieras',
  },
];

export interface SubscriptionRow {
  id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'paused' | 'past_due' | 'trial';
  plan: string;
  provider: string;
  provider_subscription_id: string | null;
  start_date: string;
  end_date: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: unknown | null;
}

interface CreateSubscriptionResponse {
  success: boolean;
  checkout_url: string;
  sandbox_url?: string;
  subscription_id?: string;
  message?: string;
}

export class BillingService {
  /** Suscripción vigente del usuario (active/trial con período no vencido), o null. */
  static async getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trial'])
        .order('start_date', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as SubscriptionRow[];
      const now = Date.now();
      // Premium = current_period_end nula o futura.
      return (
        rows.find(
          (r) => !r.current_period_end || new Date(r.current_period_end).getTime() > now
        ) ?? null
      );
    } catch (error) {
      logger.warn(LogModule.API, 'Error consultando suscripción', error);
      return null;
    }
  }

  /** ¿El usuario es premium por suscripción vigente? */
  static async isPremiumUser(userId: string): Promise<boolean> {
    return (await this.getActiveSubscription(userId)) !== null;
  }

  /**
   * Crea el checkout de MercadoPago vía Edge Function `create-subscription`.
   * Requiere que la función esté desplegada con los secrets de MP.
   * Devuelve la `checkout_url` para abrir en nueva pestaña.
   */
  static async createSubscription(planType: PlanType): Promise<CreateSubscriptionResponse> {
    const { data, error } = await supabase.functions.invoke<CreateSubscriptionResponse>(
      'create-subscription',
      { body: { planType } }
    );
    if (error) {
      logger.error(LogModule.API, 'Error en create-subscription', error);
      throw error;
    }
    if (!data?.success || !data.checkout_url) {
      throw new Error('No se pudo procesar el pago. Inténtalo nuevamente.');
    }
    return data;
  }
}
