import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { ENV_CONFIG, RUNTIME_CONFIG } from '@/config/env.config';
import {
  ANALYTICS_TIME_PERIODS,
  DATA_VALIDATION,
} from '@/config/analytics.config';

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
  type:
    | 'loss_aversion'
    | 'mental_accounting'
    | 'present_bias'
    | 'social_proof'
    | 'emotional_spending'
    | 'anchoring_bias'
    | 'availability_heuristic'
    | 'confirmation_bias';
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

interface CompleteAnalyticsResult {
  spendingPatterns: SpendingPattern[];
  monthlyInsights: MonthlyInsight[];
  psychologicalInsights: PsychologicalInsight[];
  forecast: SpendingForecast | null;
  metadata: {
    fetchedAt: string;
    dataSources: {
      patterns: 'available' | 'empty' | 'error';
      insights: 'available' | 'empty' | 'error';
      psychological: 'available' | 'empty' | 'error';
      forecast: 'available' | 'disabled' | 'error';
    };
    performance: {
      cacheInterval: number;
      apiTimeout: number;
      processingTime?: number;
    };
  };
}

/**
 * Analytics service completo con datos reales de Supabase y fallbacks para desarrollo
 * Sistema simplificado sin Machine Learning para mayor estabilidad
 */
class AnalyticsService {
  /**
   * Basic analytics tracking methods
   * These are enhanced to use the configuration system
   */
  static track(event: string, properties?: Record<string, unknown>) {
    if (!RUNTIME_CONFIG.featuresEnabled.analytics) return;

    logger.info(LogModule.DB, `Analytics Event: ${event}`, properties);

    // In development, log to console for debugging
    if (ENV_CONFIG.DEBUG_MODE) {
      console.log(`📊 Analytics Event: ${event}`, properties);
    }
  }

  // ==================== ANÁLISIS FINANCIERO ====================

  /**
   * Get complete analytics data for a user in a single call
   * Uses traditional analytics without ML complexity
   */
  static async getCompleteAnalytics(
    userId: string,
    options: {
      spendingPatternsDays?: number;
      monthlyInsightsMonths?: number;
      forecastDays?: number;
      includePsychological?: boolean;
    } = {}
  ): Promise<CompleteAnalyticsResult> {
    const {
      spendingPatternsDays = ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS,
      monthlyInsightsMonths = ANALYTICS_TIME_PERIODS.DEFAULT_MONTHLY_INSIGHTS_MONTHS,
      forecastDays = ANALYTICS_TIME_PERIODS.DEFAULT_FORECAST_DAYS,
      includePsychological = true,
    } = options;

    const startTime = Date.now();

    try {
      logger.start(LogModule.DB, 'Getting complete analytics', {
        userId,
        options,
      });

      // Get traditional analytics data
      const [spendingPatterns, monthlyInsights] = await Promise.all([
        this.getSpendingPatterns(userId, spendingPatternsDays),
        this.getMonthlyInsights(userId, monthlyInsightsMonths),
      ]);

      // Generate psychological insights using real data when available
      const psychologicalInsights = includePsychological
        ? await this.generatePersonalizedPsychologicalInsights(
            userId,
            spendingPatterns,
            monthlyInsights
          )
        : [];

      // Generate forecast from real data
      const forecast = await this.getSpendingForecast(
        userId,
        forecastDays,
        monthlyInsights
      );

      const processingTime = Date.now() - startTime;

      logger.success(LogModule.DB, 'Analytics completed', {
        spendingPatterns: spendingPatterns.length,
        monthlyInsights: monthlyInsights.length,
        psychologicalInsights: psychologicalInsights.length,
        processingTime,
      });

      return {
        spendingPatterns,
        monthlyInsights,
        psychologicalInsights,
        forecast,
        metadata: {
          fetchedAt: new Date().toISOString(),
          dataSources: {
            patterns: spendingPatterns.length > 0 ? 'available' : 'empty',
            insights: monthlyInsights.length > 0 ? 'available' : 'empty',
            psychological:
              psychologicalInsights.length > 0 ? 'available' : 'empty',
            forecast: forecast ? 'available' : 'disabled',
          },
          performance: {
            cacheInterval: ENV_CONFIG.CACHE_INTERVAL,
            apiTimeout: ENV_CONFIG.API_TIMEOUT,
            processingTime,
          },
        },
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error fetching complete analytics', error);
      throw error;
    }
  }

  // ==================== PATRONES DE GASTO ====================

  /**
   * Get spending patterns for the specified time period
   */
  static async getSpendingPatterns(
    userId: string,
    days: number = ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS
  ): Promise<SpendingPattern[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Try to get real data first
      const { data: realData, error } = await supabase.rpc(
        'get_spending_patterns_for_period',
        {
          user_uuid: userId,
          days_back: days,
        }
      );

      if (error) {
        logger.error(
          LogModule.DB,
          'SQL function error for spending patterns',
          error
        );
      }

      if (realData && realData.length > 0) {
        logger.info(LogModule.DB, 'Real spending patterns loaded', {
          patterns: realData.length,
          days,
        });
        // Transform data to match expected interface
        return realData.map((pattern) => ({
          category: pattern.category || 'Sin categoría',
          amount: Number(pattern.amount) || 0,
          frequency: pattern.frequency || 0,
          trend: (pattern.trend as 'up' | 'down' | 'stable') || 'stable',
          averageAmount: Number(pattern.average_amount) || 0,
        }));
      }

      // Check if user has any transactions at all
      const { data: hasTransactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .limit(1);

      if (!hasTransactions || hasTransactions.length === 0) {
        logger.info(
          LogModule.DB,
          'No transactions found, returning empty patterns'
        );
        return [];
      }

      // User has transactions but not enough for patterns
      logger.info(LogModule.DB, 'Insufficient data for spending patterns');
      return [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fetching spending patterns', error);
      return [];
    }
  }

  // ==================== INSIGHTS MENSUALES ====================

  /**
   * Get monthly insights for analytics dashboard
   */
  static async getMonthlyInsights(
    userId: string,
    months: number = ANALYTICS_TIME_PERIODS.DEFAULT_MONTHLY_INSIGHTS_MONTHS
  ): Promise<MonthlyInsight[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Try to get real data first
      const { data: realData, error } = await supabase.rpc(
        'get_monthly_spending_insights',
        {
          user_uuid: userId,
          months_back: months,
        }
      );

      if (error) {
        logger.error(
          LogModule.DB,
          'SQL function error for monthly insights',
          error
        );
      }

      if (realData && realData.length > 0) {
        logger.info(LogModule.DB, 'Real monthly insights loaded', {
          insights: realData.length,
          months,
        });
        // Transform data to match expected interface
        return realData.map((insight) => ({
          month: insight.month || 'Unknown',
          totalSpent: Number(insight.total_spent) || 0,
          budgetVariance: Number(insight.budget_variance) || 0,
          topCategories: Array.isArray(insight.top_categories)
            ? insight.top_categories.slice(0, 3) // Top 3
            : [{ category: 'Sin datos', amount: 0, percentage: 0 }],
          savingsRate: Number(insight.savings_rate) || 0,
          streakDays: insight.streak_days || 0,
        }));
      }

      // Check if user has any transactions for insights
      const { data: hasTransactions } = await supabase
        .from('transactions')
        .select('id, transaction_date')
        .eq('user_id', userId)
        .gte(
          'transaction_date',
          new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .limit(1);

      if (!hasTransactions || hasTransactions.length === 0) {
        logger.info(
          LogModule.DB,
          'No recent transactions found, returning empty insights'
        );
        return [];
      }

      // Insufficient data for insights
      logger.info(LogModule.DB, 'Insufficient data for monthly insights');
      return [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fetching monthly insights', error);
      return [];
    }
  }

  // ==================== VALIDACIÓN Y CONFIGURACIÓN ====================

  /**
   * Validate if user has sufficient data for meaningful analytics
   */
  static async validateUserData(userId: string): Promise<{
    hasData: boolean;
    dataQuality: number;
    missingDataTypes: string[];
  }> {
    try {
      const [transactions, goals, contributions] = await Promise.all([
        supabase
          .from('micro_contributions')
          .select('id')
          .eq('user_id', userId)
          .limit(DATA_VALIDATION.MIN_TRANSACTIONS_FOR_INSIGHTS),
        supabase.from('goals').select('id').eq('user_id', userId).limit(5),
        supabase
          .from('micro_contributions')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const hasTransactions =
        transactions.data &&
        transactions.data.length >=
          DATA_VALIDATION.MIN_TRANSACTIONS_FOR_INSIGHTS;
      const hasGoals = goals.data && goals.data.length > 0;
      const hasRecentActivity =
        contributions.data &&
        contributions.data.length > 0 &&
        new Date(contributions.data[0].created_at) >
          new Date(
            Date.now() - ENV_CONFIG.MIN_DAYS_OF_DATA * 24 * 60 * 60 * 1000
          );

      const dataPoints = [hasTransactions, hasGoals, hasRecentActivity];
      const dataQuality = dataPoints.filter(Boolean).length / dataPoints.length;

      const missingDataTypes: string[] = [];
      if (!hasTransactions) missingDataTypes.push('transactions');
      if (!hasGoals) missingDataTypes.push('goals');
      if (!hasRecentActivity) missingDataTypes.push('recent_activity');

      return {
        hasData: dataQuality >= 0.5,
        dataQuality,
        missingDataTypes,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error validating user data', error);
      return {
        hasData: false,
        dataQuality: 0,
        missingDataTypes: ['all'],
      };
    }
  }

  // ==================== FORECAST ====================

  /**
   * Generate spending forecast based on real transaction data
   */
  static async getSpendingForecast(
    userId: string,
    days: number = 30,
    monthlyInsights?: MonthlyInsight[]
  ): Promise<SpendingForecast | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get recent transaction data for forecast
      const { data: transactionSummary } = await supabase.rpc(
        'get_user_transaction_summary',
        {
          user_uuid: userId,
          days_back: Math.min(days * 3, 90), // Use up to 90 days of history
        }
      );

      if (!transactionSummary || transactionSummary.length === 0) {
        logger.info(LogModule.DB, 'No transaction data for forecast');
        return null;
      }

      const summary = transactionSummary[0];
      const totalExpenses = Number(summary.total_expenses) || 0;
      const transactionCount = summary.transaction_count || 0;
      const historicalDays = summary.days_with_data || days;

      if (totalExpenses === 0 || transactionCount === 0) {
        return null;
      }

      // Calculate daily average
      const dailyAverage = totalExpenses / historicalDays;

      // Apply trend multiplier from monthly insights
      let trendMultiplier = 1.0;
      if (monthlyInsights && monthlyInsights.length >= 2) {
        const current = monthlyInsights[0].totalSpent;
        const previous = monthlyInsights[1].totalSpent;
        if (previous > 0) {
          trendMultiplier = current / previous;
        }
      }

      // Calculate predicted amount
      const baseAmount = dailyAverage * days * trendMultiplier;
      const predictedAmount = Math.round(baseAmount);

      // Calculate confidence based on data consistency
      const confidence = Math.min(0.5 + transactionCount / 50, 0.95);

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (trendMultiplier > 1.1) {
        trend = 'up';
      } else if (trendMultiplier < 0.9) {
        trend = 'down';
      }

      return {
        predicted_amount: predictedAmount,
        confidence: Math.round(confidence * 100) / 100,
        trend,
        based_on_days: historicalDays,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error generating spending forecast', error);
      return null;
    }
  }

  /**
   * Generate personalized psychological insights based on real user data
   */
  static async generatePersonalizedPsychologicalInsights(
    userId: string,
    spendingPatterns: SpendingPattern[],
    monthlyInsights: MonthlyInsight[]
  ): Promise<PsychologicalInsight[]> {
    try {
      logger.start(
        LogModule.DB,
        'Generating personalized psychological insights',
        {
          userId,
          patternsCount: spendingPatterns.length,
          insightsCount: monthlyInsights.length,
        }
      );

      const insights: PsychologicalInsight[] = [];

      // Get additional transaction data for better analysis
      const { data: transactionSummary } = await supabase.rpc(
        'get_user_transaction_summary',
        {
          user_uuid: userId,
          days_back: 30,
        }
      );

      const totalExpenses = transactionSummary?.[0]?.total_expenses || 0;
      const transactionCount = transactionSummary?.[0]?.transaction_count || 0;
      const topCategory = transactionSummary?.[0]?.top_category || 'Sin datos';
      const spendingTrend = transactionSummary?.[0]?.spending_trend || 'stable';

      // 1. LOSS AVERSION - Based on spending increases
      if (spendingTrend === 'up' && monthlyInsights.length >= 2) {
        const lastMonthSpend = monthlyInsights[0]?.totalSpent || 0;
        const previousMonthSpend = monthlyInsights[1]?.totalSpent || 0;
        const increasePercent =
          previousMonthSpend > 0
            ? ((lastMonthSpend - previousMonthSpend) / previousMonthSpend) * 100
            : 0;

        if (increasePercent > 10) {
          insights.push({
            type: 'loss_aversion',
            title: 'Aumento en Gastos Detectado',
            description: `Tus gastos aumentaron ${Math.round(increasePercent)}% este mes ($${Math.round(lastMonthSpend - previousMonthSpend)}). Es natural resistirse a “perder” dinero, pero pequeños ajustes pueden revertir esta tendencia.`,
            impact: increasePercent > 25 ? 'high' : 'medium',
            actionable: `Revisa tu categoría principal (${topCategory}) y establece un límite diario de $${Math.round((totalExpenses / 30) * 0.9)} para reducir gradualmente.`,
          });
        }
      }

      // 2. MENTAL ACCOUNTING - Based on category distribution
      const highSpendingCategory = spendingPatterns.find(
        (p) => p.amount > totalExpenses * 0.4
      );
      if (highSpendingCategory && totalExpenses > 0) {
        const categoryPercent =
          (highSpendingCategory.amount / totalExpenses) * 100;
        insights.push({
          type: 'mental_accounting',
          title: 'Concentración de Gasto Detectada',
          description: `El ${Math.round(categoryPercent)}% de tus gastos van a ${highSpendingCategory.category}. Tendemos a crear “cuentas mentales” separadas, pero es importante ver el panorama completo.`,
          impact: categoryPercent > 60 ? 'high' : 'medium',
          actionable: `Diversifica tus gastos: destina máximo 50% a ${highSpendingCategory.category} y explora alternativas más económicas.`,
        });
      }

      // 3. PRESENT BIAS - Based on transaction frequency
      if (transactionCount >= 5) {
        // Many small transactions
        const avgTransactionAmount = totalExpenses / transactionCount;
        insights.push({
          type: 'present_bias',
          title: 'Patrón de Gastos Frecuentes',
          description: `Realizaste ${transactionCount} transacciones este mes (promedio $${Math.round(avgTransactionAmount)}). ${transactionCount >= 10 ? 'Los gastos pequeños y frecuentes pueden sumar más de lo que esperamos.' : 'Estás comenzando a crear un patrón de gastos.'}`,
          impact: avgTransactionAmount < 20 ? 'high' : 'medium',
          actionable: `Implementa la regla del “día de espera”: antes de compras menores a $50, espera 24 horas para decidir si realmente las necesitas.`,
        });
      }

      // If no personalized insights were generated, return empty array
      if (insights.length === 0) {
        logger.info(
          LogModule.DB,
          'No personalized insights generated - insufficient data'
        );
        return [];
      }

      logger.success(
        LogModule.DB,
        'Personalized psychological insights generated',
        {
          insightsGenerated: insights.length,
        }
      );

      return insights.slice(0, 3); // Return top 3 insights
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error generating personalized insights',
        error
      );
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get current analytics configuration
   */
  static getConfiguration() {
    return {
      features: RUNTIME_CONFIG.featuresEnabled,
      performance: {
        cacheInterval: ENV_CONFIG.CACHE_INTERVAL,
        apiTimeout: ENV_CONFIG.API_TIMEOUT,
      },
      validation: DATA_VALIDATION,
      debug: ENV_CONFIG.DEBUG_MODE,
    };
  }
}

// Export the service and types
export { AnalyticsService };
export type {
  SpendingPattern,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingForecast,
  CompleteAnalyticsResult,
};

// Default export for easier importing
export default AnalyticsService;
