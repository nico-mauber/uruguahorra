import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import {
  ANALYTICS_TIME_PERIODS,
  DATA_VALIDATION,
} from '@/config/analytics.config';
import { SpendingPattern } from './types';

export class SpendingPatternsService {
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
        return this.transformSpendingPatterns(realData);
      }

      // Check if user has any transactions at all
      const hasTransactions = await this.checkUserTransactions(userId);
      if (!hasTransactions) {
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

  /**
   * Transform raw database data to SpendingPattern interface
   */
  private static transformSpendingPatterns(rawData: any[]): SpendingPattern[] {
    return rawData.map((pattern) => ({
      category: pattern.category || 'Sin categoría',
      amount: Number(pattern.amount) || 0,
      frequency: pattern.frequency || 0,
      trend: (pattern.trend as 'up' | 'down' | 'stable') || 'stable',
      averageAmount: Number(pattern.average_amount) || 0,
    }));
  }

  /**
   * Check if user has any transactions for patterns analysis
   */
  private static async checkUserTransactions(userId: string): Promise<boolean> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .limit(1);

    return transactions && transactions.length > 0;
  }

  /**
   * Validate if user has sufficient data for meaningful patterns
   */
  static async validatePatternsData(userId: string): Promise<{
    hasData: boolean;
    transactionCount: number;
    categoriesCount: number;
  }> {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('category')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte(
          'transaction_date',
          new Date(
            Date.now() -
              ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS *
                24 *
                60 *
                60 *
                1000
          ).toISOString()
        );

      const transactionCount = transactions?.length || 0;
      const uniqueCategories = new Set(
        transactions?.map((t) => t.category) || []
      ).size;

      return {
        hasData:
          transactionCount >= DATA_VALIDATION.MIN_TRANSACTIONS_FOR_INSIGHTS,
        transactionCount,
        categoriesCount: uniqueCategories,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error validating patterns data', error);
      return { hasData: false, transactionCount: 0, categoriesCount: 0 };
    }
  }
}
