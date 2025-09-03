import { logger, LogModule } from '@/utils/logger';
import { ENV_CONFIG } from '@/config/env.config';
import { DATA_VALIDATION } from '@/config/analytics.config';
import {
  CompleteAnalytics,
  UserDataValidation,
  SpendingPattern,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingForecast,
} from './types';
import { SpendingPatternsService } from './SpendingPatternsService';
import { MonthlyInsightsService } from './MonthlyInsightsService';
import { PsychologicalInsightsService } from './PsychologicalInsightsService';
import { ForecastService } from './ForecastService';
import { supabase } from '@/lib/supabase';

export class AnalyticsAggregatorService {
  private static analyticsCache = new Map<
    string,
    { data: CompleteAnalytics; timestamp: number }
  >();
  private static readonly CACHE_DURATION =
    ENV_CONFIG.CACHE_INTERVAL || 10 * 60 * 1000; // 10 minutes

  /**
   * Get complete analytics for a user with intelligent caching
   */
  static async getCompleteAnalytics(
    userId: string
  ): Promise<CompleteAnalytics> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check cache first
      const cached = this.analyticsCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        logger.info(LogModule.DB, 'Returning cached analytics', { userId });
        return cached.data;
      }

      const startTime = Date.now();
      logger.start(LogModule.DB, 'Fetching complete analytics', { userId });

      // Fetch all analytics in parallel for better performance
      const [spendingPatterns, monthlyInsights] = await Promise.allSettled([
        SpendingPatternsService.getSpendingPatterns(userId),
        MonthlyInsightsService.getMonthlyInsights(userId),
      ]);

      // Extract results, handling any failures gracefully
      const patterns =
        spendingPatterns.status === 'fulfilled' ? spendingPatterns.value : [];
      const insights =
        monthlyInsights.status === 'fulfilled' ? monthlyInsights.value : [];

      // Generate psychological insights and forecast in parallel
      const [psychologicalInsights, forecast] = await Promise.allSettled([
        PsychologicalInsightsService.generatePersonalizedPsychologicalInsights(
          userId,
          patterns,
          insights
        ),
        ForecastService.getSpendingForecast(userId, insights),
      ]);

      const psyInsights =
        psychologicalInsights.status === 'fulfilled'
          ? psychologicalInsights.value
          : [];
      const forecastResult =
        forecast.status === 'fulfilled' ? forecast.value : null;

      const processingTime = Date.now() - startTime;

      const completeAnalytics: CompleteAnalytics = {
        spendingPatterns: patterns,
        monthlyInsights: insights,
        psychologicalInsights: psyInsights,
        forecast: forecastResult,
        metadata: {
          fetchedAt: new Date().toISOString(),
          dataSources: {
            patterns: patterns.length > 0 ? 'available' : 'empty',
            insights: insights.length > 0 ? 'available' : 'empty',
            psychological: psyInsights.length > 0 ? 'available' : 'empty',
            forecast: forecastResult ? 'available' : 'disabled',
          },
          performance: {
            cacheInterval: this.CACHE_DURATION,
            apiTimeout: ENV_CONFIG.API_TIMEOUT || 30000,
            processingTime,
          },
        },
      };

      // Cache the results
      this.analyticsCache.set(userId, {
        data: completeAnalytics,
        timestamp: Date.now(),
      });

      logger.info(LogModule.DB, 'Complete analytics fetched successfully', {
        userId,
        spendingPatterns: patterns.length,
        monthlyInsights: insights.length,
        psychologicalInsights: psyInsights.length,
        processingTime,
      });

      return completeAnalytics;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fetching complete analytics', error);
      throw error;
    }
  }

  /**
   * Validate if user has sufficient data for meaningful analytics
   */
  static async validateUserData(userId: string): Promise<UserDataValidation> {
    try {
      const [transactions, goals, contributions] = await Promise.allSettled([
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
          .gte(
            'created_at',
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          ),
      ]);

      const transactionCount =
        transactions.status === 'fulfilled'
          ? transactions.value.data?.length || 0
          : 0;
      const goalCount =
        goals.status === 'fulfilled' ? goals.value.data?.length || 0 : 0;
      const recentContributions =
        contributions.status === 'fulfilled'
          ? contributions.value.data?.length || 0
          : 0;

      const hasMinimumData =
        transactionCount >= DATA_VALIDATION.MIN_TRANSACTIONS_FOR_INSIGHTS;
      const hasGoals = goalCount > 0;
      const hasRecentActivity = recentContributions > 0;

      const dataQuality = this.calculateDataQuality(
        transactionCount,
        goalCount,
        recentContributions
      );
      const missingDataTypes = this.identifyMissingDataTypes(
        hasMinimumData,
        hasGoals,
        hasRecentActivity
      );

      return {
        hasData: hasMinimumData,
        dataQuality,
        missingDataTypes,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error validating user data', error);
      return {
        hasData: false,
        dataQuality: 0,
        missingDataTypes: ['transactions', 'goals', 'contributions'],
      };
    }
  }

  /**
   * Calculate data quality score (0-100)
   */
  private static calculateDataQuality(
    transactionCount: number,
    goalCount: number,
    recentContributions: number
  ): number {
    let score = 0;

    // Transaction data (50% of score)
    if (transactionCount >= DATA_VALIDATION.MIN_TRANSACTIONS_FOR_INSIGHTS) {
      score += 30;
      if (transactionCount >= 20) score += 10;
      if (transactionCount >= 50) score += 10;
    }

    // Goal data (25% of score)
    if (goalCount > 0) {
      score += 15;
      if (goalCount >= 3) score += 10;
    }

    // Recent activity (25% of score)
    if (recentContributions > 0) {
      score += 15;
      if (recentContributions >= 10) score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Identify missing data types for user feedback
   */
  private static identifyMissingDataTypes(
    hasTransactions: boolean,
    hasGoals: boolean,
    hasRecentActivity: boolean
  ): string[] {
    const missing: string[] = [];

    if (!hasTransactions) missing.push('transactions');
    if (!hasGoals) missing.push('goals');
    if (!hasRecentActivity) missing.push('recent_activity');

    return missing;
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
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, category, transaction_date')
        .eq('user_id', userId)
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString())
        .order('transaction_date', { ascending: false });

      if (!transactions) {
        return {
          spendingPatterns: [],
          totalSpent: 0,
          totalIncome: 0,
          categoryBreakdown: [],
        };
      }

      const expenses = transactions.filter((t) => t.type === 'expense');
      const income = transactions.filter((t) => t.type === 'income');

      const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);

      // Calculate category breakdown
      const categoryTotals = new Map<string, number>();
      expenses.forEach((t) => {
        const category = t.category || 'Sin categoría';
        categoryTotals.set(
          category,
          (categoryTotals.get(category) || 0) + Number(t.amount)
        );
      });

      const categoryBreakdown = Array.from(categoryTotals.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        spendingPatterns: [], // Would implement pattern detection here
        totalSpent,
        totalIncome,
        categoryBreakdown,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting analytics for period', error);
      return {
        spendingPatterns: [],
        totalSpent: 0,
        totalIncome: 0,
        categoryBreakdown: [],
      };
    }
  }

  /**
   * Clear analytics cache for user or all users
   */
  static clearAnalyticsCache(userId?: string): void {
    if (userId) {
      this.analyticsCache.delete(userId);
      // Also clear psychological insights cache
      PsychologicalInsightsService.clearRatiosCache(userId);
    } else {
      this.analyticsCache.clear();
      PsychologicalInsightsService.clearRatiosCache();
    }

    logger.info(LogModule.DB, 'Analytics cache cleared', {
      userId: userId || 'all',
    });
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): {
    analyticsCache: { size: number; entries: string[] };
    ratiosCache: { size: number; entries: string[] };
  } {
    return {
      analyticsCache: {
        size: this.analyticsCache.size,
        entries: Array.from(this.analyticsCache.keys()),
      },
      ratiosCache: PsychologicalInsightsService.getCacheStats(),
    };
  }

  /**
   * Preload analytics for user (useful for background processing)
   */
  static async preloadAnalytics(userId: string): Promise<void> {
    try {
      logger.info(LogModule.DB, 'Preloading analytics', { userId });
      await this.getCompleteAnalytics(userId);
    } catch (error) {
      logger.warn(LogModule.DB, 'Failed to preload analytics', {
        userId,
        error,
      });
    }
  }

  /**
   * Get lightweight analytics summary (for quick dashboard loads)
   */
  static async getAnalyticsSummary(userId: string): Promise<{
    hasData: boolean;
    lastUpdated: string;
    insightCount: number;
    spendingTrend: 'up' | 'down' | 'stable';
  }> {
    try {
      // Check if we have cached data
      const cached = this.analyticsCache.get(userId);
      if (cached) {
        return {
          hasData: true,
          lastUpdated: cached.data.metadata.fetchedAt,
          insightCount: cached.data.psychologicalInsights.length,
          spendingTrend: cached.data.forecast?.trend || 'stable',
        };
      }

      // Quick validation without full analytics
      const validation = await this.validateUserData(userId);

      return {
        hasData: validation.hasData,
        lastUpdated: new Date().toISOString(),
        insightCount: 0,
        spendingTrend: 'stable',
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting analytics summary', error);
      return {
        hasData: false,
        lastUpdated: new Date().toISOString(),
        insightCount: 0,
        spendingTrend: 'stable',
      };
    }
  }
}
