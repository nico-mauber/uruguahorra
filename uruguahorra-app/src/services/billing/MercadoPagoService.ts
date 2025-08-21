import { logger, LogModule } from '@/utils/logger';
import type {
  MercadoPagoPreapprovalOptions,
  CheckoutResult,
} from '@/types/billing';

export class MercadoPagoService {
  private static readonly API_URL =
    process.env.NODE_ENV === 'production'
      ? 'https://ebkzqfmppdntmynfjehh.supabase.co/functions/v1'
      : 'https://ebkzqfmppdntmynfjehh.supabase.co/functions/v1';

  /**
   * Crear preapproval de MercadoPago para suscripciones
   */
  static async createPreapproval(
    options: MercadoPagoPreapprovalOptions
  ): Promise<CheckoutResult> {
    try {
      logger.info(LogModule.DB, 'Creando preapproval MercadoPago', {
        amount: options.autoRecurring.transaction_amount,
        frequency: options.autoRecurring.frequency,
      });

      // Obtener el token de autenticación del usuario
      const { supabase } = await import('@/lib/supabase');
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      // Determinar el tipo de plan basado en la frecuencia
      const planType =
        options.autoRecurring.frequency === 12 ? 'annual' : 'monthly';

      const response = await fetch(`${this.API_URL}/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planType }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error al crear preapproval: ${error}`);
      }

      const data = await response.json();

      logger.success(LogModule.DB, 'Preapproval creado', {
        subscriptionId: data.subscription_id,
        checkoutUrl: data.checkout_url,
      });

      return {
        url: data.checkout_url,
        preapprovalId: data.subscription_id,
      };
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error creando preapproval MercadoPago',
        error
      );
      throw error;
    }
  }

  /**
   * Cancelar preapproval
   */
  static async cancelPreapproval(preapprovalId: string): Promise<boolean> {
    try {
      logger.info(LogModule.DB, 'Cancelando preapproval', { preapprovalId });

      const response = await fetch(`${this.API_URL}/cancel-preapproval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preapprovalId }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error al cancelar preapproval: ${error}`);
      }

      logger.success(LogModule.DB, 'Preapproval cancelado exitosamente');
      return true;
    } catch (error) {
      logger.error(LogModule.DB, 'Error cancelando preapproval', error);
      throw error;
    }
  }

  /**
   * Obtener estado del preapproval
   */
  static async getPreapprovalStatus(preapprovalId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.API_URL}/preapproval/${preapprovalId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener estado del preapproval');
      }

      return await response.json();
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo estado preapproval', error);
      throw error;
    }
  }
}
