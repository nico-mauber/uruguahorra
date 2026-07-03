/**
 * Servicio de análisis financiero (analytics). Envuelve los RPC de lectura.
 * Fuente: docs/api/contracts-and-data-mapping.md §3,
 * docs/features/analytics/analytics-functional-specs.md.
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - No existe módulo ANALYTICS en el logger → se usa LogModule.DB.
 * - Analytics es NO crítico: ante error se advierte y se devuelve [] o null;
 *   nunca se relanza para no romper la pantalla.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import type {
  EnhancedAnalytics,
  MonthlyInsight,
  SpendingPattern,
  TransactionSummary,
} from '@/types/analytics';

export class AnalyticsService {
  /** Patrones de gasto por categoría (top 10) para `days` días. Tab Patrones. */
  static async getSpendingPatterns(
    userId: string,
    days: number
  ): Promise<SpendingPattern[]> {
    try {
      const { data, error } = await supabase.rpc(
        'get_spending_patterns_for_period',
        { user_uuid: userId, days_back: days }
      );
      if (error) throw error;
      return (data ?? []) as SpendingPattern[];
    } catch (error) {
      logger.warn(LogModule.DB, 'Error obteniendo patrones de gasto', error);
      return [];
    }
  }

  /** Insights mensuales para los últimos `months` meses. Tab Insights. */
  static async getMonthlyInsights(
    userId: string,
    months: number
  ): Promise<MonthlyInsight[]> {
    try {
      const { data, error } = await supabase.rpc(
        'get_monthly_spending_insights',
        { user_uuid: userId, months_back: months }
      );
      if (error) throw error;
      return (data ?? []) as MonthlyInsight[];
    } catch (error) {
      logger.warn(LogModule.DB, 'Error obteniendo insights mensuales', error);
      return [];
    }
  }

  /** Resumen de transacciones (quick stats + tendencia). Devuelve la 1ª fila. */
  static async getTransactionSummary(
    userId: string,
    days: number
  ): Promise<TransactionSummary | null> {
    try {
      const { data, error } = await supabase.rpc(
        'get_user_transaction_summary',
        { user_uuid: userId, days_back: days }
      );
      if (error) throw error;
      const rows = (data ?? []) as TransactionSummary[];
      return rows[0] ?? null;
    } catch (error) {
      logger.warn(LogModule.DB, 'Error obteniendo resumen de transacciones', error);
      return null;
    }
  }

  /** Analytics avanzado (29 métricas) para el motor de insights. 1ª fila. */
  static async getEnhancedAnalytics(
    userId: string,
    days: number
  ): Promise<EnhancedAnalytics | null> {
    try {
      const { data, error } = await supabase.rpc('get_enhanced_user_analytics', {
        user_uuid: userId,
        days_back: days,
      });
      if (error) throw error;
      const rows = (data ?? []) as EnhancedAnalytics[];
      return rows[0] ?? null;
    } catch (error) {
      logger.warn(LogModule.DB, 'Error obteniendo analytics avanzado', error);
      return null;
    }
  }
}
