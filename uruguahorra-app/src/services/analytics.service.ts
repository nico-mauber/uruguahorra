// Optimized Analytics Service - Refactored into modular architecture
import { logger, LogModule } from '@/utils/logger';
import { ENV_CONFIG } from '@/config/env.config';
import {
  AnalyticsAggregatorService,
  SpendingPatternsService,
  MonthlyInsightsService,
  PsychologicalInsightsService,
  ForecastService,
  type CompleteAnalytics,
  type UserDataValidation,
  type SpendingPattern,
  type MonthlyInsight,
  type PsychologicalInsight,
  type SpendingForecast,
} from './analytics';

/**
 * Legacy AnalyticsService - Provides backward compatibility
 *
 * This service now acts as a facade/proxy to the new modular architecture.
 * All heavy logic has been moved to specialized services for better maintainability.
 *
 * New modular services:
 * - AnalyticsAggregatorService: Main coordinator with intelligent caching
 * - SpendingPatternsService: Spending patterns analysis
 * - MonthlyInsightsService: Monthly insights generation
 * - PsychologicalInsightsService: AI-powered psychological insights with factory pattern
 * - ForecastService: Spending forecasting
 * - CacheService: Intelligent caching and memoization
 *
 * Benefits of the new architecture:
 * - 90% reduction in file size (1934 → ~200 lines)
 * - Modular separation of concerns
 * - Configuration-driven insights (easy to maintain and extend)
 * - Intelligent caching with automatic cleanup
 * - Better error handling and logging
 * - Factory pattern for insight generation
 * - Memoization for expensive calculations
 * - Promise.allSettled for graceful error handling
 */
class AnalyticsService {
  /**
   * Basic analytics tracking methods
   */
  static track(event: string, properties?: Record<string, unknown>) {
    logger.info(LogModule.DB, `Analytics Event: ${event}`, properties);

    if (ENV_CONFIG.DEBUG_MODE) {
      console.log(`📊 Analytics Event: ${event}`, properties);
    }
  }

  // ==================== MAIN ENTRY POINT ====================

  /**
   * Get complete analytics data for a user including patterns, insights, and forecasts
   *
   * @deprecated Use AnalyticsAggregatorService.getCompleteAnalytics() directly for better performance
   * This method is maintained for backward compatibility
   */
  static async getCompleteAnalytics(
    userId: string
  ): Promise<CompleteAnalytics> {
    logger.info(
      LogModule.DB,
      'Legacy AnalyticsService.getCompleteAnalytics called',
      { userId }
    );
    return AnalyticsAggregatorService.getCompleteAnalytics(userId);
  }

  // ==================== SPENDING PATTERNS ====================

  /**
   * Get spending patterns for the specified time period
   *
   * @deprecated Use SpendingPatternsService.getSpendingPatterns() directly
   * This method is maintained for backward compatibility
   */
  static async getSpendingPatterns(
    userId: string,
    days?: number
  ): Promise<SpendingPattern[]> {
    logger.info(
      LogModule.DB,
      'Legacy AnalyticsService.getSpendingPatterns called',
      { userId, days }
    );
    return SpendingPatternsService.getSpendingPatterns(userId, days);
  }

  // ==================== MONTHLY INSIGHTS ====================

  /**
   * Get monthly insights for analytics dashboard
   *
   * @deprecated Use MonthlyInsightsService.getMonthlyInsights() directly
   * This method is maintained for backward compatibility
   */
  static async getMonthlyInsights(
    userId: string,
    months?: number
  ): Promise<MonthlyInsight[]> {
    logger.info(
      LogModule.DB,
      'Legacy AnalyticsService.getMonthlyInsights called',
      { userId, months }
    );
    return MonthlyInsightsService.getMonthlyInsights(userId, months);
  }

  // ==================== PSYCHOLOGICAL INSIGHTS ====================

  /**
   * Generate personalized psychological insights based on real user data
   *
   * @deprecated Use PsychologicalInsightsService.generatePersonalizedPsychologicalInsights() directly
   * This method is maintained for backward compatibility
   */
  static async generatePersonalizedPsychologicalInsights(
    userId: string,
    spendingPatterns: SpendingPattern[],
    monthlyInsights: MonthlyInsight[]
  ): Promise<PsychologicalInsight[]> {
    logger.info(
      LogModule.DB,
      'Legacy AnalyticsService.generatePersonalizedPsychologicalInsights called',
      { userId }
    );
    return PsychologicalInsightsService.generatePersonalizedPsychologicalInsights(
      userId,
      spendingPatterns,
      monthlyInsights
    );
  }

  // ==================== FORECASTING ====================

  /**
   * Generate spending forecast based on historical data
   *
   * @deprecated Use ForecastService.getSpendingForecast() directly
   * This method is maintained for backward compatibility
   */
  static async getSpendingForecast(
    userId: string,
    monthlyInsights: MonthlyInsight[],
    days?: number
  ): Promise<SpendingForecast | null> {
    logger.info(
      LogModule.DB,
      'Legacy AnalyticsService.getSpendingForecast called',
      { userId, days }
    );
    return ForecastService.getSpendingForecast(userId, monthlyInsights, days);
  }

  // ==================== VALIDATION ====================

  /**
   * Validate if user has sufficient data for meaningful analytics
   *
   * @deprecated Use AnalyticsAggregatorService.validateUserData() directly
   * This method is maintained for backward compatibility
   */
  static async validateUserData(userId: string): Promise<UserDataValidation> {
    logger.info(
      LogModule.DB,
      'Legacy AnalyticsService.validateUserData called',
      { userId }
    );
    return AnalyticsAggregatorService.validateUserData(userId);
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Clear analytics cache for user or all users
   */
  static clearCache(userId?: string): void {
    logger.info(LogModule.DB, 'Clearing analytics cache via legacy service', {
      userId: userId || 'all',
    });
    AnalyticsAggregatorService.clearAnalyticsCache(userId);
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): {
    analyticsCache: { size: number; entries: string[] };
    ratiosCache: { size: number; entries: string[] };
  } {
    return AnalyticsAggregatorService.getCacheStats();
  }

  // ==================== ADDITIONAL UTILITY METHODS ====================

  /**
   * Get lightweight analytics summary (for quick dashboard loads)
   */
  static async getAnalyticsSummary(userId: string): Promise<{
    hasData: boolean;
    lastUpdated: string;
    insightCount: number;
    spendingTrend: 'up' | 'down' | 'stable';
  }> {
    return AnalyticsAggregatorService.getAnalyticsSummary(userId);
  }

  /**
   * Preload analytics for user (useful for background processing)
   */
  static async preloadAnalytics(userId: string): Promise<void> {
    return AnalyticsAggregatorService.preloadAnalytics(userId);
  }

  /**
   * Get analytics for specific time period
   */
  static async getAnalyticsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    spendingPatterns: SpendingPattern[];
    totalSpent: number;
    totalIncome: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  }> {
    return AnalyticsAggregatorService.getAnalyticsForPeriod(
      userId,
      startDate,
      endDate
    );
  }

  /**
   * Get spending trends for recent months
   */
  static async getSpendingTrends(
    userId: string,
    months: number = 3
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    monthlyAverages: number[];
  }> {
    return MonthlyInsightsService.getSpendingTrends(userId, months);
  }

  /**
   * Get forecast accuracy metrics
   */
  static async getForecastAccuracy(
    userId: string,
    forecastAge: number = 30
  ): Promise<{
    accuracy: number;
    meanError: number;
    forecastCount: number;
  }> {
    return ForecastService.getForecastAccuracy(userId, forecastAge);
  }

  /**
   * Get spending forecast for specific categories
   */
  static async getCategoryForecast(
    userId: string,
    category: string,
    days: number = 30
  ): Promise<SpendingForecast | null> {
    return ForecastService.getCategoryForecast(userId, category, days);
  }
}

// Export the service
export { AnalyticsService };

// Also export the new modular services for direct access
export {
  AnalyticsAggregatorService,
  SpendingPatternsService,
  MonthlyInsightsService,
  PsychologicalInsightsService,
  ForecastService,
} from './analytics';

// Export types
export type {
  CompleteAnalytics,
  UserDataValidation,
  SpendingPattern,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingForecast,
} from './analytics';
