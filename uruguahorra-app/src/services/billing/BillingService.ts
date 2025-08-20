import { logger, LogModule } from '@/utils/logger';
import type {
  SubscriptionPlan,
  CheckoutResult,
} from '@/types/billing';
import { MercadoPagoService } from './MercadoPagoService';

export class BillingService {
  // Configuración de planes
  static readonly SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
    premium_monthly: {
      id: 'premium_monthly',
      name: 'Premium Mensual',
      price: 4.99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Metas ilimitadas',
        'Análisis avanzado de gastos',
        'Importación automática de transacciones',
        'Desafíos premium exclusivos',
        'Acceso a squads privados',
        'Contenido educativo avanzado',
        'Soporte prioritario',
      ],
      priceId: {
        mercadopago: 'premium_monthly_mp',
      },
    },
    premium_yearly: {
      id: 'premium_yearly',
      name: 'Premium Anual',
      price: 39.99,
      currency: 'USD',
      interval: 'year',
      discount: '33% de descuento',
      features: [
        'Todas las características premium',
        'Análisis predictivo de ahorro',
        'Asesoría financiera personalizada',
        'Reportes avanzados',
        'Exportación de datos',
        'API access (próximamente)',
        '2 meses gratis incluidos',
      ],
      priceId: {
        mercadopago: 'premium_yearly_mp',
      },
    },
  };

  /**
   * Crear checkout de suscripción (solo MercadoPago)
   */
  static async createCheckout(
    planId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutResult> {
    try {
      logger.start(LogModule.DB, 'Creando checkout de suscripción MercadoPago', {
        planId,
        userId,
      });

      const plan = this.SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        throw new Error(`Plan no encontrado: ${planId}`);
      }

      return await MercadoPagoService.createPreapproval({
        reason: `Suscripción ${plan.name} - Uruguahorra`,
        userId,
        autoRecurring: {
          frequency: plan.interval === 'month' ? 1 : 12,
          frequency_type: 'months',
          transaction_amount: plan.price,
          currency_id: 'UYU',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
        back_url: successUrl,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error creando checkout', error);
      throw error;
    }
  }

  /**
   * Obtener plan por ID
   */
  static getPlan(planId: string): SubscriptionPlan | null {
    return this.SUBSCRIPTION_PLANS[planId] || null;
  }

  /**
   * Obtener todos los planes
   */
  static getAllPlans(): SubscriptionPlan[] {
    return Object.values(this.SUBSCRIPTION_PLANS);
  }
}
