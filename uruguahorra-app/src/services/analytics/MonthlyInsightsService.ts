import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { ANALYTICS_TIME_PERIODS } from '@/config/analytics.config';
import { MonthlyInsight } from './types';

export class MonthlyInsightsService {
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
        return this.transformMonthlyInsights(realData);
      }

      // Check if user has any transactions for insights
      const hasRecentTransactions = await this.checkRecentTransactions(
        userId,
        months
      );
      if (!hasRecentTransactions) {
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

  /**
   * Transform raw database data to MonthlyInsight interface
   */
  private static transformMonthlyInsights(rawData: any[]): MonthlyInsight[] {
    return rawData.map((insight) => ({
      month: insight.month || 'Unknown',
      totalSpent: Number(insight.total_spent) || 0,
      budgetVariance: Number(insight.budget_variance) || 0,
      topCategories: this.processTopCategories(insight.top_categories),
      savingsRate: Number(insight.savings_rate) || 0,
      streakDays: insight.streak_days || 0,
    }));
  }

  /**
   * Process top categories data safely
   */
  private static processTopCategories(
    rawCategories: any
  ): MonthlyInsight['topCategories'] {
    if (Array.isArray(rawCategories)) {
      return rawCategories.slice(0, 3); // Top 3
    }
    return [{ category: 'Sin datos', amount: 0, percentage: 0 }];
  }

  /**
   * Check if user has recent transactions for insights
   */
  private static async checkRecentTransactions(
    userId: string,
    months: number
  ): Promise<boolean> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, transaction_date')
      .eq('user_id', userId)
      .gte(
        'transaction_date',
        new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .limit(1);

    return transactions && transactions.length > 0;
  }

  /**
   * Get monthly spending summary for specific month
   */
  static async getMonthlySpendingSummary(
    userId: string,
    monthOffset: number = 0
  ): Promise<{
    totalSpent: number;
    totalIncome: number;
    netCashFlow: number;
    transactionCount: number;
  }> {
    try {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - monthOffset);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const { data: expenses } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', monthStart.toISOString())
        .lte('transaction_date', monthEnd.toISOString());

      const { data: income } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'income')
        .gte('transaction_date', monthStart.toISOString())
        .lte('transaction_date', monthEnd.toISOString());

      const totalSpent =
        expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalIncome =
        income?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const transactionCount = (expenses?.length || 0) + (income?.length || 0);

      return {
        totalSpent,
        totalIncome,
        netCashFlow: totalIncome - totalSpent,
        transactionCount,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting monthly summary', error);
      return {
        totalSpent: 0,
        totalIncome: 0,
        netCashFlow: 0,
        transactionCount: 0,
      };
    }
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
    try {
      const monthlyTotals: number[] = [];

      for (let i = 0; i < months; i++) {
        const summary = await this.getMonthlySpendingSummary(userId, i);
        monthlyTotals.unshift(summary.totalSpent); // Add to beginning for chronological order
      }

      if (monthlyTotals.length < 2) {
        return {
          trend: 'stable',
          changePercent: 0,
          monthlyAverages: monthlyTotals,
        };
      }

      const firstMonth = monthlyTotals[0];
      const lastMonth = monthlyTotals[monthlyTotals.length - 1];

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let changePercent = 0;

      if (firstMonth > 0) {
        changePercent = ((lastMonth - firstMonth) / firstMonth) * 100;

        if (changePercent > 10) trend = 'increasing';
        else if (changePercent < -10) trend = 'decreasing';
      }

      return { trend, changePercent, monthlyAverages: monthlyTotals };
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculating spending trends', error);
      return { trend: 'stable', changePercent: 0, monthlyAverages: [] };
    }
  }
}
