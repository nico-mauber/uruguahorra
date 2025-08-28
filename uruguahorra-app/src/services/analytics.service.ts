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

export interface CompleteAnalyticsResult {
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
    };
  };
}

/**
 * Analytics service completo con fallbacks para desarrollo
 * Versión temporal con datos mock hasta que las funciones SQL estén disponibles
 */
class AnalyticsService {
  /**
   * Basic analytics tracking methods
   * These are enhanced to use the configuration system
   */
  static track(event: string, properties?: Record<string, unknown>) {
    if (ENV_CONFIG.ANALYTICS_ENABLED && ENV_CONFIG.VERBOSE_LOGGING) {
      console.log(`[AnalyticsService] Event queued: ${event}`, properties);
    }
    // TODO: Implement actual analytics tracking (PostHog, etc.)
  }

  static identify(userId: string, traits?: Record<string, unknown>) {
    if (ENV_CONFIG.ANALYTICS_ENABLED && ENV_CONFIG.VERBOSE_LOGGING) {
      console.log(`[AnalyticsService] Identify queued: ${userId}`, traits);
    }
    // TODO: Implement actual user identification
  }

  static isFeatureEnabled(flagKey: keyof typeof ENV_CONFIG): boolean {
    const enabled = ENV_CONFIG[flagKey] ?? false;
    if (ENV_CONFIG.VERBOSE_LOGGING) {
      console.log(`[AnalyticsService] Feature flag ${flagKey}:`, enabled);
    }
    return Boolean(enabled);
  }

  static reset() {
    if (ENV_CONFIG.VERBOSE_LOGGING) {
      console.log('[AnalyticsService] Reset queued');
    }
    // TODO: Implement analytics reset
  }

  /**
   * Configuration and utility methods
   */
  static getConfiguration() {
    return {
      envConfig: ENV_CONFIG,
      runtimeConfig: RUNTIME_CONFIG,
      featuresEnabled: RUNTIME_CONFIG.featuresEnabled,
    };
  }

  static validateAnalyticsData(data: any): boolean {
    if (!data) return false;

    // Basic validation for spending patterns
    if (Array.isArray(data) && data.length > 0) {
      return data.every(
        (item) =>
          item.category &&
          typeof item.amount === 'number' &&
          typeof item.frequency === 'number'
      );
    }

    return true; // Allow other data types through
  }

  // ==================== ANÁLISIS FINANCIERO ====================

  /**
   * Get complete analytics data for a user in a single call
   * Optimized for performance with parallel execution
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

    try {
      logger.start(LogModule.DB, 'Getting complete analytics', {
        userId,
        options,
        parallelExecution: true,
      });

      // Execute core analytics calls in parallel for better performance
      const [spendingPatterns, monthlyInsights] = await Promise.all([
        this.getSpendingPatterns(userId, spendingPatternsDays),
        this.getMonthlyInsights(userId, monthlyInsightsMonths),
      ]);

      // Get forecast separately if enabled
      const forecast = RUNTIME_CONFIG.featuresEnabled.spendingForecast
        ? await this.getSpendingForecast(userId, forecastDays)
        : null;

      // Generate psychological insights with context from monthly insights
      const psychologicalInsights =
        includePsychological &&
        RUNTIME_CONFIG.featuresEnabled.psychologicalInsights
          ? await this.getPsychologicalInsights(userId, monthlyInsights)
          : [];

      const result: CompleteAnalyticsResult = {
        spendingPatterns,
        monthlyInsights,
        psychologicalInsights,
        forecast,
        metadata: {
          fetchedAt: new Date().toISOString(),
          dataSources: {
            patterns: spendingPatterns.length > 0
              ? ('available' as const)
              : ('empty' as const),
            insights: monthlyInsights.length > 0
              ? ('available' as const)
              : ('empty' as const),
            psychological: psychologicalInsights.length > 0
              ? ('available' as const)
              : ('empty' as const),
            forecast: forecast
              ? ('available' as const)
              : ('disabled' as const),
          },
          performance: {
            cacheInterval: ENV_CONFIG.CACHE_INTERVAL,
            apiTimeout: ENV_CONFIG.API_TIMEOUT,
          },
        },
      };

      logger.success(LogModule.DB, 'Complete analytics retrieved', {
        patternsCount: spendingPatterns.length,
        insightsCount: monthlyInsights.length,
        psychologicalCount: psychologicalInsights.length,
        hasForecast: !!forecast,
      });

      return result;
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting complete analytics', error);
      throw error;
    }
  }

  static async getSpendingPatterns(
    userId: string,
    days: number = ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS
  ): Promise<SpendingPattern[]> {
    try {
      // Validate input parameters
      const validatedDays = Math.min(
        Math.max(days, 1),
        DATA_VALIDATION.MAX_PATTERN_DAYS
      );

      logger.start(LogModule.DB, 'Getting spending patterns', {
        userId,
        requestedDays: days,
        validatedDays,
        useRealData: RUNTIME_CONFIG.featuresEnabled.analytics,
      });

      // Try SQL function first if features are enabled
      if (RUNTIME_CONFIG.featuresEnabled.analytics) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          ENV_CONFIG.API_TIMEOUT
        );

        try {
          const { data, error } = await supabase.rpc('get_spending_patterns', {
            user_id: userId,
            days_back: validatedDays,
          });

          clearTimeout(timeoutId);

          if (!error && data && Array.isArray(data) && data.length > 0) {
            logger.success(
              LogModule.DB,
              'Spending patterns retrieved from database',
              { recordCount: data.length }
            );
            return data;
          }
        } catch (sqlError) {
          clearTimeout(timeoutId);
          logger.warn(
            LogModule.DB,
            'SQL function failed, using fallback',
            sqlError
          );
        }
      }

      // Check if we should try harder to get real data
      if (ENV_CONFIG.PREFER_REAL_DATA) {
        logger.info(
          LogModule.DB,
          'Real data preferred but SQL function unavailable',
          {
            reason: 'Will return empty array instead of mock data',
          }
        );
        return [];
      }

      // Fallback to mock data only if explicitly enabled and not preferring real data
      if (ENV_CONFIG.MOCK_FALLBACK) {
        logger.warn(LogModule.DB, 'Using mock data for spending patterns', {
          reason:
            'SQL function not available or disabled, real data not preferred',
        });
        return generateMockSpendingPatterns(userId, validatedDays);
      }

      // No data available
      logger.error(
        LogModule.DB,
        'No data source available for spending patterns'
      );
      return [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting spending patterns', error);

      // Return mock data as last resort only if not preferring real data
      if (ENV_CONFIG.PREFER_REAL_DATA) {
        return [];
      }
      return ENV_CONFIG.MOCK_FALLBACK
        ? generateMockSpendingPatterns(userId, days)
        : [];
    }
  }

  static async getMonthlyInsights(
    userId: string,
    monthsBack: number = ANALYTICS_TIME_PERIODS.DEFAULT_MONTHLY_INSIGHTS_MONTHS
  ): Promise<MonthlyInsight[]> {
    try {
      // Validate input parameters
      const validatedMonths = Math.min(
        Math.max(monthsBack, 1),
        DATA_VALIDATION.MAX_INSIGHT_MONTHS
      );

      logger.start(LogModule.DB, 'Getting monthly insights', {
        userId,
        requestedMonths: monthsBack,
        validatedMonths,
        useRealData: RUNTIME_CONFIG.featuresEnabled.analytics,
      });

      // Try SQL function first if features are enabled
      if (RUNTIME_CONFIG.featuresEnabled.analytics) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          ENV_CONFIG.API_TIMEOUT
        );

        try {
          const { data, error } = await supabase.rpc('get_monthly_insights', {
            user_id: userId,
            months_back: validatedMonths,
          });

          clearTimeout(timeoutId);

          if (!error && data && Array.isArray(data) && data.length > 0) {
            logger.success(
              LogModule.DB,
              'Monthly insights retrieved from database',
              { recordCount: data.length }
            );
            return data;
          }
        } catch (sqlError) {
          clearTimeout(timeoutId);
          logger.warn(
            LogModule.DB,
            'SQL function failed, using fallback',
            sqlError
          );
        }
      }

      // Check if we should try harder to get real data
      if (ENV_CONFIG.PREFER_REAL_DATA) {
        logger.info(
          LogModule.DB,
          'Real data preferred but SQL function unavailable',
          {
            reason: 'Will return empty array instead of mock data',
          }
        );
        return [];
      }

      // Fallback to mock data only if explicitly enabled and not preferring real data
      if (ENV_CONFIG.MOCK_FALLBACK) {
        logger.warn(LogModule.DB, 'Using mock data for monthly insights', {
          reason:
            'SQL function not available or disabled, real data not preferred',
        });
        return generateMockMonthlyInsights(userId, validatedMonths);
      }

      // No data available
      logger.error(
        LogModule.DB,
        'No data source available for monthly insights'
      );
      return [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting monthly insights', error);

      // Return mock data as last resort only if not preferring real data
      if (ENV_CONFIG.PREFER_REAL_DATA) {
        return [];
      }
      return ENV_CONFIG.MOCK_FALLBACK
        ? generateMockMonthlyInsights(userId, monthsBack)
        : [];
    }
  }

  static async getPsychologicalInsights(
    userId: string,
    monthlyInsights?: MonthlyInsight[]
  ): Promise<PsychologicalInsight[]> {
    try {
      logger.start(LogModule.DB, 'Getting psychological insights', {
        userId,
        hasMonthlyData: !!monthlyInsights,
        featuresEnabled: RUNTIME_CONFIG.featuresEnabled.psychologicalInsights,
      });

      // Check if psychological insights are enabled
      if (!RUNTIME_CONFIG.featuresEnabled.psychologicalInsights) {
        logger.info(LogModule.DB, 'Psychological insights disabled');
        return [];
      }

      // Get monthly insights if not provided
      let insights = monthlyInsights;
      if (!insights) {
        insights = await this.getMonthlyInsights(userId);
      }

      // Generate context-aware psychological insights
      const psychologicalInsights = generateMockPsychologicalInsights(
        userId,
        insights
      );

      // Limit insights based on configuration
      const maxInsights = ENV_CONFIG.MAX_INSIGHTS_DISPLAY;
      const limitedInsights = psychologicalInsights.slice(0, maxInsights);

      logger.success(LogModule.DB, 'Psychological insights generated', {
        totalGenerated: psychologicalInsights.length,
        displayed: limitedInsights.length,
        source: 'dynamic_generation',
      });

      return limitedInsights;
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting psychological insights', error);

      // Return minimal insight as fallback
      return ENV_CONFIG.MOCK_FALLBACK
        ? [
            {
              type: 'mental_accounting',
              title: '💡 Análisis de gastos',
              description: 'Revisa tus patrones de gasto para obtener insights',
              impact: 'medium',
              actionable:
                'Agrega más transacciones para obtener análisis detallado',
            },
          ]
        : [];
    }
  }

  static async getSpendingForecast(
    userId: string,
    days: number = ANALYTICS_TIME_PERIODS.DEFAULT_FORECAST_DAYS,
    monthlyInsights?: MonthlyInsight[]
  ): Promise<SpendingForecast> {
    try {
      // Validate input parameters
      const validatedDays = Math.min(
        Math.max(days, 1),
        DATA_VALIDATION.MAX_FORECAST_DAYS
      );

      logger.start(LogModule.DB, 'Getting spending forecast', {
        userId,
        requestedDays: days,
        validatedDays,
        useRealData: RUNTIME_CONFIG.featuresEnabled.spendingForecast,
      });

      // Check if spending forecast is enabled
      if (!RUNTIME_CONFIG.featuresEnabled.spendingForecast) {
        logger.info(LogModule.DB, 'Spending forecast disabled');
        return {
          predicted_amount: 0,
          confidence: 0,
          trend: 'stable',
          based_on_days: 0,
        };
      }

      // Try SQL function first if features are enabled
      if (RUNTIME_CONFIG.featuresEnabled.analytics) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          ENV_CONFIG.API_TIMEOUT
        );

        try {
          const { data, error } = await supabase.rpc(
            'predict_future_spending',
            {
              user_id: userId,
              forecast_days: validatedDays,
            }
          );

          clearTimeout(timeoutId);

          if (!error && data && typeof data === 'object') {
            logger.success(
              LogModule.DB,
              'Spending forecast retrieved from database',
              { confidence: data.confidence }
            );
            return data;
          }
        } catch (sqlError) {
          clearTimeout(timeoutId);
          logger.warn(
            LogModule.DB,
            'SQL function failed, using fallback',
            sqlError
          );
        }
      }

      // Fallback to mock data
      if (ENV_CONFIG.MOCK_FALLBACK) {
        // Get monthly insights if not provided
        let insights = monthlyInsights;
        if (!insights) {
          insights = await this.getMonthlyInsights(userId);
        }

        logger.warn(LogModule.DB, 'Using mock data for spending forecast', {
          reason: 'SQL function not available or disabled',
        });
        return generateMockSpendingForecast(userId, validatedDays, insights);
      }

      // No data available
      logger.error(
        LogModule.DB,
        'No data source available for spending forecast'
      );
      return {
        predicted_amount: 0,
        confidence: 0,
        trend: 'stable',
        based_on_days: 0,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting spending forecast', error);

      // Return mock data as last resort
      return ENV_CONFIG.MOCK_FALLBACK
        ? generateMockSpendingForecast(userId, days)
        : {
            predicted_amount: 0,
            confidence: 0,
            trend: 'stable',
            based_on_days: 0,
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
