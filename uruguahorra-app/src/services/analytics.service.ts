import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { ENV_CONFIG, RUNTIME_CONFIG } from '@/config/env.config';
import {
  ANALYTICS_TIME_PERIODS,
  DATA_VALIDATION,
} from '@/config/analytics.config';
import {
  generateMockSpendingPatterns,
  generateMockMonthlyInsights,
  generateMockPsychologicalInsights,
  generateMockSpendingForecast,
} from '@/data/mockAnalytics';

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

      // Generate psychological insights using mock data (with improved templates)
      const psychologicalInsights = includePsychological
        ? generateMockPsychologicalInsights(userId, monthlyInsights)
        : [];

      // Generate forecast
      const forecast = generateMockSpendingForecast(
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
      const { data: realData } = await supabase.rpc(
        'get_spending_patterns_for_period',
        {
          user_uuid: userId,
          days_back: days,
        }
      );

      if (realData && realData.length > 0) {
        logger.info(LogModule.DB, 'Real spending patterns loaded', {
          patterns: realData.length,
        });
        return realData;
      }

      // Fallback to mock data
      logger.info(LogModule.DB, 'Using mock spending patterns');
      return generateMockSpendingPatterns(userId, days);
    } catch (error) {
      logger.error(LogModule.DB, 'Error fetching spending patterns', error);
      return generateMockSpendingPatterns(userId, days);
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
      const { data: realData } = await supabase.rpc(
        'get_monthly_spending_insights',
        {
          user_uuid: userId,
          months_back: months,
        }
      );

      if (realData && realData.length > 0) {
        logger.info(LogModule.DB, 'Real monthly insights loaded', {
          insights: realData.length,
        });
        return realData;
      }

      // Fallback to mock data
      logger.info(LogModule.DB, 'Using mock monthly insights');
      return generateMockMonthlyInsights(userId, months);
    } catch (error) {
      logger.error(LogModule.DB, 'Error fetching monthly insights', error);
      return generateMockMonthlyInsights(userId, months);
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
