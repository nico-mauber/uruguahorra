import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert =
  Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate =
  Database['public']['Tables']['subscriptions']['Update'];

export class SubscriptionsService {
  /**
   * Obtener suscripción activa del usuario
   */
  static async getActiveSubscription(
    userId: string
  ): Promise<Subscription | null> {
    try {
      logger.database(LogModule.DB, 'Obteniendo suscripción activa', {
        userId,
      });

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error(
          LogModule.DB,
          'Error obteniendo suscripción activa',
          error
        );
        throw error;
      }

      if (data) {
        logger.success(LogModule.DB, 'Suscripción activa encontrada', {
          plan: data.plan,
          provider: data.provider,
        });
      } else {
        logger.info(LogModule.DB, 'No hay suscripción activa');
      }

      return data || null;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo suscripción activa',
        error
      );
      throw error;
    }
  }

  /**
   * Crear nueva suscripción
   */
  static async createSubscription(
    subscription: SubscriptionInsert
  ): Promise<Subscription> {
    try {
      logger.start(LogModule.DB, 'Creando nueva suscripción', {
        userId: subscription.user_id,
        plan: subscription.plan,
        provider: subscription.provider,
      });

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscription)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error creando suscripción', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Suscripción creada exitosamente', {
        subscriptionId: data.id,
        plan: data.plan,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal creando suscripción', error);
      throw error;
    }
  }

  /**
   * Actualizar suscripción
   */
  static async updateSubscription(
    subscriptionId: string,
    updates: SubscriptionUpdate
  ): Promise<Subscription> {
    try {
      logger.info(LogModule.DB, 'Actualizando suscripción', {
        subscriptionId,
        updates,
      });

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando suscripción', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Suscripción actualizada exitosamente');
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal actualizando suscripción', error);
      throw error;
    }
  }

  /**
   * Cancelar suscripción
   */
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    try {
      logger.warn(LogModule.DB, 'Cancelando suscripción', {
        subscriptionId,
        cancelAtPeriodEnd,
      });

      const updates: SubscriptionUpdate = {
        cancel_at_period_end: cancelAtPeriodEnd,
        cancelled_at: new Date().toISOString(),
      };

      // Si se cancela inmediatamente, cambiar el estado
      if (!cancelAtPeriodEnd) {
        updates.status = 'cancelled';
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error cancelando suscripción', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Suscripción cancelada exitosamente', {
        cancelAtPeriodEnd,
        status: data.status,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal cancelando suscripción', error);
      throw error;
    }
  }

  /**
   * Reactivar suscripción cancelada
   */
  static async reactivateSubscription(
    subscriptionId: string
  ): Promise<Subscription> {
    try {
      logger.info(LogModule.DB, 'Reactivando suscripción', { subscriptionId });

      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          cancel_at_period_end: false,
          cancelled_at: null,
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error reactivando suscripción', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Suscripción reactivada exitosamente');
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal reactivando suscripción', error);
      throw error;
    }
  }

  /**
   * Obtener historial de suscripciones del usuario
   */
  static async getUserSubscriptionHistory(
    userId: string
  ): Promise<Subscription[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo historial de suscripciones', {
        userId,
      });

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo historial', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} suscripciones en historial`
      );
      return data || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal obteniendo historial', error);
      throw error;
    }
  }

  /**
   * Verificar si el usuario es premium
   */
  static async isPremiumUser(userId: string): Promise<boolean> {
    try {
      logger.debug(LogModule.DB, 'Verificando estado premium', { userId });

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error(LogModule.DB, 'Error verificando estado premium', error);
        throw error;
      }

      const isPremium = !!data && data.status === 'active';

      // Verificar que no haya expirado
      if (isPremium && data.current_period_end) {
        const now = new Date();
        const periodEnd = new Date(data.current_period_end);

        if (now > periodEnd) {
          logger.warn(LogModule.DB, 'Suscripción expirada', {
            periodEnd: data.current_period_end,
          });
          return false;
        }
      }

      logger.debug(LogModule.DB, 'Estado premium verificado', { isPremium });
      return isPremium;
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando estado premium', error);
      return false;
    }
  }

  /**
   * Obtener información del plan premium
   */
  static getPlanInfo(plan: 'premium_monthly' | 'premium_yearly') {
    const planInfo = {
      premium_monthly: {
        name: 'Premium Mensual',
        price: 9.99,
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
      },
      premium_yearly: {
        name: 'Premium Anual',
        price: 99.99,
        currency: 'USD',
        interval: 'year',
        discount: '17% de descuento',
        features: [
          'Todas las características premium',
          'Análisis predictivo de ahorro',
          'Asesoría financiera personalizada',
          'Reportes avanzados',
          'Exportación de datos',
          'API access (próximamente)',
        ],
      },
    };

    return planInfo[plan];
  }

  /**
   * Obtener estadísticas de suscripciones (para admin)
   */
  static async getSubscriptionStats() {
    try {
      logger.database(LogModule.DB, 'Obteniendo estadísticas de suscripciones');

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan, provider, created_at');

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo estadísticas', error);
        throw error;
      }

      const subscriptions = data || [];

      // Calcular estadísticas
      const totalSubscriptions = subscriptions.length;
      const activeSubscriptions = subscriptions.filter(
        (s) => s.status === 'active'
      ).length;
      const cancelledSubscriptions = subscriptions.filter(
        (s) => s.status === 'cancelled'
      ).length;

      // Por plan
      const byPlan = subscriptions.reduce(
        (acc, s) => {
          acc[s.plan] = (acc[s.plan] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Por proveedor
      const byProvider = subscriptions.reduce(
        (acc, s) => {
          acc[s.provider] = (acc[s.provider] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Por mes (últimos 12 meses)
      const last12Months = new Date();
      last12Months.setMonth(last12Months.getMonth() - 12);

      const recentSubscriptions = subscriptions.filter(
        (s) => new Date(s.created_at) >= last12Months
      );

      const byMonth = recentSubscriptions.reduce(
        (acc, s) => {
          const month = s.created_at.substring(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const stats = {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        conversionRate:
          totalSubscriptions > 0
            ? (activeSubscriptions / totalSubscriptions) * 100
            : 0,
        byPlan,
        byProvider,
        byMonth,
        churnRate:
          totalSubscriptions > 0
            ? (cancelledSubscriptions / totalSubscriptions) * 100
            : 0,
      };

      logger.success(
        LogModule.DB,
        'Estadísticas de suscripciones calculadas',
        stats
      );
      return stats;
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculando estadísticas', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de proveedor de pagos
   */
  static async processPaymentWebhook(
    provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google',
    eventType: string,
    data: unknown
  ) {
    try {
      logger.info(LogModule.DB, 'Procesando webhook de pago', {
        provider,
        eventType,
      });

      switch (eventType) {
        case 'subscription.created':
        case 'subscription.updated':
          await this.handleSubscriptionUpdate(provider, data);
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancellation(provider, data);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSuccess(provider, data);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailure(provider, data);
          break;

        default:
          logger.warn(LogModule.DB, 'Evento de webhook no manejado', {
            eventType,
          });
      }

      logger.success(LogModule.DB, 'Webhook procesado exitosamente');
    } catch (error) {
      logger.error(LogModule.DB, 'Error procesando webhook', error);
      throw error;
    }
  }

  /**
   * Manejar actualización de suscripción desde webhook
   */
  private static async handleSubscriptionUpdate(
    provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google',
    data: unknown
  ) {
    try {
      // Lógica específica por proveedor para extraer datos
      const subscriptionData = this.extractSubscriptionData(provider, data);

      if (!subscriptionData.userId) {
        throw new Error('No se pudo obtener userId del webhook');
      }

      // Buscar suscripción existente
      const { data: existing, error: existingError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', subscriptionData.userId)
        .eq('provider', provider)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existing) {
        // Actualizar suscripción existente
        await this.updateSubscription(existing.id, subscriptionData.updates);
      } else {
        // Crear nueva suscripción
        await this.createSubscription(subscriptionData.insert);
      }

      logger.success(LogModule.DB, 'Suscripción actualizada desde webhook');
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error manejando actualización de suscripción',
        error
      );
      throw error;
    }
  }

  /**
   * Manejar cancelación desde webhook
   */
  private static async handleSubscriptionCancellation(
    provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google',
    data: unknown
  ) {
    try {
      const subscriptionData = this.extractSubscriptionData(provider, data);

      if (!subscriptionData.userId) {
        throw new Error('No se pudo obtener userId del webhook de cancelación');
      }

      // Encontrar y cancelar suscripción
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', subscriptionData.userId)
        .eq('provider', provider)
        .eq('status', 'active')
        .single();

      if (error) {
        logger.warn(
          LogModule.DB,
          'Suscripción no encontrada para cancelar',
          error
        );
        return;
      }

      await this.cancelSubscription(subscription.id, false);
      logger.success(LogModule.DB, 'Suscripción cancelada desde webhook');
    } catch (error) {
      logger.error(LogModule.DB, 'Error manejando cancelación', error);
      throw error;
    }
  }

  /**
   * Manejar pago exitoso
   */
  private static async handlePaymentSuccess(
    provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google',
    _data: unknown
  ) {
    try {
      logger.info(LogModule.DB, 'Procesando pago exitoso', { provider });

      // Aquí se podría registrar el pago en una tabla de transacciones
      // o actualizar el período de suscripción

      logger.success(LogModule.DB, 'Pago exitoso procesado');
    } catch (error) {
      logger.error(LogModule.DB, 'Error manejando pago exitoso', error);
      throw error;
    }
  }

  /**
   * Manejar pago fallido
   */
  private static async handlePaymentFailure(
    provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google',
    data: unknown
  ) {
    try {
      logger.warn(LogModule.DB, 'Procesando pago fallido', { provider });

      const subscriptionData = this.extractSubscriptionData(provider, data);

      if (subscriptionData.userId) {
        // Cambiar estado a past_due
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', subscriptionData.userId)
          .eq('provider', provider)
          .single();

        if (subscription) {
          await this.updateSubscription(subscription.id, {
            status: 'past_due',
          });
        }
      }

      logger.success(LogModule.DB, 'Pago fallido procesado');
    } catch (error) {
      logger.error(LogModule.DB, 'Error manejando pago fallido', error);
      throw error;
    }
  }

  /**
   * Extraer datos de suscripción según el proveedor
   */
  private static extractSubscriptionData(
    provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google',
    data: unknown
  ): {
    userId?: string;
    updates?: SubscriptionUpdate;
    insert?: SubscriptionInsert;
  } {
    // Esta función debe ser implementada según la estructura
    // específica de cada proveedor de pagos

    switch (provider) {
      case 'stripe':
        return this.extractStripeData(data);
      case 'paypal':
        return this.extractPayPalData(data);
      case 'mercadopago':
        return this.extractMercadoPagoData(data);
      case 'apple':
        return this.extractAppleData(data);
      case 'google':
        return this.extractGoogleData(data);
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  // Métodos específicos para cada proveedor (implementación básica)
  private static extractStripeData(data: unknown) {
    return {
      userId: data.metadata?.userId,
      updates: {
        status: data.status,
        current_period_start: data.current_period_start
          ? new Date(data.current_period_start * 1000).toISOString()
          : undefined,
        current_period_end: data.current_period_end
          ? new Date(data.current_period_end * 1000).toISOString()
          : undefined,
      },
    };
  }

  private static extractPayPalData(data: unknown) {
    return {
      userId: data.custom_id,
      // Implementar según estructura de PayPal
    };
  }

  private static extractMercadoPagoData(data: unknown) {
    return {
      userId: data.external_reference,
      // Implementar según estructura de MercadoPago
    };
  }

  private static extractAppleData(data: unknown) {
    return {
      userId: data.applicationUsername,
      // Implementar según estructura de Apple
    };
  }

  private static extractGoogleData(data: unknown) {
    return {
      userId: data.developerPayload,
      // Implementar según estructura de Google
    };
  }
}
