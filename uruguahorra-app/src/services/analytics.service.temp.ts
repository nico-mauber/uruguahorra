/* eslint-disable prettier/prettier */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

interface SpendingPattern {
  category: string;
  amount: number;
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  averageAmount: number;
}

interface MonthlyInsight {
  month: string;
  totalSpent: number;
  budgetVariance: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  savingsRate: number;
  streakDays: number;
}

interface PsychologicalInsight {
  type: 'loss_aversion' | 'mental_accounting' | 'present_bias' | 'social_proof';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: string;
}

interface SpendingForecast {
  predicted_amount: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  based_on_days: number;
}

/**
 * Analytics service completo con fallbacks para desarrollo
 * Versión temporal con datos mock hasta que las funciones SQL estén disponibles
 */
class AnalyticsService {
  static track(event: string, properties?: Record<string, unknown>) {
    console.log(`[AnalyticsService] Event queued: ${event}`, properties);
  }

  static identify(userId: string, traits?: Record<string, unknown>) {
    console.log(`[AnalyticsService] Identify queued: ${userId}`, traits);
  }

  static isFeatureEnabled(flagKey: string): boolean {
    console.log(
      `[AnalyticsService] Feature flag ${flagKey} check - defaulting to false`
    );
    return false;
  }

  static reset() {
    console.log('[AnalyticsService] Reset queued');
  }

  // ==================== ANÁLISIS FINANCIERO ====================

  static async getSpendingPatterns(
    userId: string,
    days: number = 30
  ): Promise<SpendingPattern[]> {
    try {
      logger.start(LogModule.DB, 'Getting spending patterns', { userId, days });

      // Intentar la función real primero
      const { data, error } = await supabase.rpc('get_spending_patterns', {
        user_id: userId,
        days_back: days,
      });

      if (!error && data) {
        logger.success(
          LogModule.DB,
          'Spending patterns retrieved from database'
        );
        return data;
      }

      // Fallback con datos mock
      logger.warn(
        LogModule.DB,
        'Using mock data for spending patterns - SQL function not available'
      );
      return [
        {
          category: 'Comida',
          amount: 450,
          frequency: 12,
          trend: 'up' as const,
          averageAmount: 37.5,
        },
        {
          category: 'Transporte',
          amount: 200,
          frequency: 8,
          trend: 'stable' as const,
          averageAmount: 25,
        },
        {
          category: 'Entretenimiento',
          amount: 150,
          frequency: 5,
          trend: 'down' as const,
          averageAmount: 30,
        },
      ];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error getting spending patterns, using mock data',
        error
      );
      return [
        {
          category: 'Comida',
          amount: 450,
          frequency: 12,
          trend: 'up' as const,
          averageAmount: 37.5,
        },
      ];
    }
  }

  static async getMonthlyInsights(
    userId: string,
    monthsBack: number = 6
  ): Promise<MonthlyInsight[]> {
    try {
      logger.start(LogModule.DB, 'Getting monthly insights', {
        userId,
        monthsBack,
      });

      // Intentar la función real primero
      const { data, error } = await supabase.rpc('get_monthly_insights', {
        user_id: userId,
        months_back: monthsBack,
      });

      if (!error && data) {
        logger.success(
          LogModule.DB,
          'Monthly insights retrieved from database'
        );
        return data;
      }

      // Fallback con datos mock
      logger.warn(
        LogModule.DB,
        'Using mock data for monthly insights - SQL function not available'
      );
      return [
        {
          month: '2025-08',
          totalSpent: 800,
          budgetVariance: 20,
          topCategories: [
            { category: 'Comida', amount: 450, percentage: 56 },
            { category: 'Transporte', amount: 200, percentage: 25 },
            { category: 'Entretenimiento', amount: 150, percentage: 19 },
          ],
          savingsRate: 15,
          streakDays: 5,
        },
        {
          month: '2025-07',
          totalSpent: 750,
          budgetVariance: 10,
          topCategories: [
            { category: 'Comida', amount: 400, percentage: 53 },
            { category: 'Transporte', amount: 180, percentage: 24 },
            { category: 'Entretenimiento', amount: 170, percentage: 23 },
          ],
          savingsRate: 20,
          streakDays: 12,
        },
      ];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error getting monthly insights, using mock data',
        error
      );
      return [
        {
          month: '2025-08',
          totalSpent: 800,
          budgetVariance: 20,
          topCategories: [{ category: 'Comida', amount: 450, percentage: 56 }],
          savingsRate: 15,
          streakDays: 5,
        },
      ];
    }
  }

  static async getPsychologicalInsights(
    userId: string
  ): Promise<PsychologicalInsight[]> {
    try {
      logger.start(LogModule.DB, 'Getting psychological insights', { userId });

      // Por ahora usamos datos mock hasta que las funciones SQL estén disponibles
      const insights: PsychologicalInsight[] = [
        {
          type: 'loss_aversion',
          title: '🚨 Presupuesto excedido',
          description: 'Has gastado 20% más de tu presupuesto este mes',
          impact: 'high',
          actionable:
            'Revisa tus gastos en las categorías principales y ajusta para los próximos días',
        },
        {
          type: 'mental_accounting',
          title: '💡 Tu categoría principal: Comida',
          description: 'Representa el 56% de tus gastos',
          impact: 'medium',
          actionable:
            'Considera si esta proporción refleja tus prioridades reales',
        },
        {
          type: 'present_bias',
          title: '📊 Proyección mensual',
          description: 'A tu ritmo actual gastarás $1200 este mes',
          impact: 'medium',
          actionable: 'Ajusta tus gastos diarios para alcanzar tu meta mensual',
        },
        {
          type: 'social_proof',
          title: '🎯 ¡Inicia tu racha!',
          description: 'Comienza una racha de cumplimiento de metas',
          impact: 'medium',
          actionable:
            'Usuarios constantes ahorran 40% más que usuarios esporádicos',
        },
      ];

      logger.success(
        LogModule.DB,
        'Psychological insights generated (mock data for development)'
      );
      return insights;
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting psychological insights', error);
      return [
        {
          type: 'mental_accounting',
          title: '💡 Análisis de gastos',
          description: 'Revisa tus patrones de gasto para obtener insights',
          impact: 'medium',
          actionable:
            'Agrega más transacciones para obtener análisis detallado',
        },
      ];
    }
  }

  static async getSpendingForecast(
    userId: string,
    days: number = 30
  ): Promise<SpendingForecast> {
    try {
      logger.start(LogModule.DB, 'Getting spending forecast', { userId, days });

      // Intentar la función real primero
      const { data, error } = await supabase.rpc('predict_future_spending', {
        user_id: userId,
        forecast_days: days,
      });

      if (!error && data) {
        logger.success(
          LogModule.DB,
          'Spending forecast retrieved from database'
        );
        return data;
      }

      // Fallback con datos mock
      logger.warn(
        LogModule.DB,
        'Using mock data for spending forecast - SQL function not available'
      );
      return {
        predicted_amount: 1200,
        confidence: 0.7,
        trend: 'up' as const,
        based_on_days: 15,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting spending forecast', error);
      return {
        predicted_amount: 1000,
        confidence: 0.5,
        trend: 'stable' as const,
        based_on_days: 10,
      };
    }
  }
}

// Helper functions for common event tracking
export const trackGoalEvent = (
  event: string,
  props?: Record<string, unknown>
) => {
  AnalyticsService.track(event, props);
};

export const trackContributionEvent = (
  event: string,
  props?: Record<string, unknown>
) => {
  AnalyticsService.track(event, props);
};

export { AnalyticsService };

// Export interfaces
export type {
  SpendingPattern,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingForecast,
};

// Re-export eventos y tipos del hook
export { AnalyticsEvents } from '@/hooks/useAnalytics';
export type {
  GoalEventProps,
  ContributionEventProps,
  ChallengeEventProps,
  SubscriptionEventProps,
  ErrorEventProps,
} from '@/hooks/useAnalytics';
