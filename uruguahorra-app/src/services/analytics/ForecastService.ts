import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { SpendingForecast, MonthlyInsight } from './types';
import { ANALYTICS_TIME_PERIODS } from '@/config/analytics.config';

export class ForecastService {
  /**
   * Generate spending forecast based on historical data
   */
  static async getSpendingForecast(
    userId: string,
    monthlyInsights: MonthlyInsight[],
    days: number = ANALYTICS_TIME_PERIODS.DEFAULT_FORECAST_DAYS
  ): Promise<SpendingForecast | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required for forecast');
      }

      logger.start(LogModule.DB, 'Generating spending forecast', {
        userId,
        days,
      });

      // Get recent transaction data for forecast
      const transactionData = await this.getRecentTransactionData(userId, days);

      if (!transactionData.hasData) {
        logger.info(LogModule.DB, 'No transaction data for forecast');
        return null;
      }

      // Calculate base prediction from historical data
      const basePrediction = this.calculateBasePrediction(transactionData);

      // Apply trend multiplier from monthly insights
      const trendMultiplier = this.calculateTrendMultiplier(monthlyInsights);

      // Generate final forecast
      const forecast = this.generateFinalForecast(
        basePrediction,
        trendMultiplier,
        transactionData
      );

      logger.info(LogModule.DB, 'Spending forecast generated successfully', {
        predictedAmount: forecast.predicted_amount,
        confidence: forecast.confidence,
        trend: forecast.trend,
      });

      return forecast;
    } catch (error) {
      logger.error(LogModule.DB, 'Error generating spending forecast', error);
      return null;
    }
  }

  /**
   * Get recent transaction data for analysis
   */
  private static async getRecentTransactionData(
    userId: string,
    days: number
  ): Promise<{
    hasData: boolean;
    totalAmount: number;
    transactionCount: number;
    dailyAverage: number;
    historicalDays: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', startDate.toISOString())
        .order('transaction_date', { ascending: false });

      if (!transactions || transactions.length === 0) {
        return {
          hasData: false,
          totalAmount: 0,
          transactionCount: 0,
          dailyAverage: 0,
          historicalDays: 0,
        };
      }

      const totalAmount = transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      const transactionCount = transactions.length;

      // Calculate actual days with data
      const dates = transactions.map((t) =>
        new Date(t.transaction_date).toDateString()
      );
      const uniqueDays = new Set(dates).size;

      const dailyAverage = uniqueDays > 0 ? totalAmount / uniqueDays : 0;

      return {
        hasData: true,
        totalAmount,
        transactionCount,
        dailyAverage,
        historicalDays: uniqueDays,
      };
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error getting recent transaction data',
        error
      );
      return {
        hasData: false,
        totalAmount: 0,
        transactionCount: 0,
        dailyAverage: 0,
        historicalDays: 0,
      };
    }
  }

  /**
   * Calculate base prediction from historical data
   */
  private static calculateBasePrediction(transactionData: {
    totalAmount: number;
    transactionCount: number;
    dailyAverage: number;
    historicalDays: number;
  }): { amount: number; confidence: number } {
    const { dailyAverage, historicalDays, transactionCount } = transactionData;

    // Project for next 30 days
    const predictedAmount = dailyAverage * 30;

    // Calculate confidence based on data quality
    let confidence = 0.5; // Base confidence

    // More historical days = higher confidence
    if (historicalDays >= 20) confidence += 0.3;
    else if (historicalDays >= 10) confidence += 0.2;
    else if (historicalDays >= 5) confidence += 0.1;

    // More transactions = higher confidence
    if (transactionCount >= 20) confidence += 0.2;
    else if (transactionCount >= 10) confidence += 0.1;

    // Cap confidence at 0.95
    confidence = Math.min(confidence, 0.95);

    return { amount: predictedAmount, confidence };
  }

  /**
   * Calculate trend multiplier from monthly insights
   */
  private static calculateTrendMultiplier(
    monthlyInsights: MonthlyInsight[]
  ): number {
    if (monthlyInsights.length < 2) return 1.0; // No trend data

    try {
      // Compare last two months
      const lastMonth = monthlyInsights[0];
      const previousMonth = monthlyInsights[1];

      if (!lastMonth?.totalSpent || !previousMonth?.totalSpent) return 1.0;

      const changePercent =
        ((lastMonth.totalSpent - previousMonth.totalSpent) /
          previousMonth.totalSpent) *
        100;

      // Apply conservative trend adjustment (max ±20%)
      if (changePercent > 15) return 1.15; // Increasing trend
      if (changePercent < -15) return 0.85; // Decreasing trend

      // Moderate adjustments for smaller changes
      if (changePercent > 5) return 1.05;
      if (changePercent < -5) return 0.95;

      return 1.0; // Stable trend
    } catch (error) {
      logger.warn(LogModule.DB, 'Error calculating trend multiplier', error);
      return 1.0;
    }
  }

  /**
   * Generate final forecast with all adjustments
   */
  private static generateFinalForecast(
    basePrediction: { amount: number; confidence: number },
    trendMultiplier: number,
    transactionData: { historicalDays: number }
  ): SpendingForecast {
    const predictedAmount = Math.round(basePrediction.amount * trendMultiplier);

    // Adjust confidence based on trend reliability
    let adjustedConfidence = basePrediction.confidence;
    if (trendMultiplier !== 1.0 && transactionData.historicalDays < 15) {
      adjustedConfidence *= 0.9; // Reduce confidence for trends with limited data
    }

    // Determine trend direction
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (trendMultiplier > 1.1) {
      trend = 'up';
    } else if (trendMultiplier < 0.9) {
      trend = 'down';
    }

    return {
      predicted_amount: predictedAmount,
      confidence: Math.round(adjustedConfidence * 100) / 100,
      trend,
      based_on_days: transactionData.historicalDays,
    };
  }

  /**
   * Get forecast accuracy metrics (for monitoring and improvement)
   */
  static async getForecastAccuracy(
    userId: string,
    forecastAge: number = 30
  ): Promise<{
    accuracy: number;
    meanError: number;
    forecastCount: number;
  }> {
    try {
      // This would typically compare past forecasts with actual spending
      // For now, return placeholder metrics

      logger.info(LogModule.DB, 'Calculating forecast accuracy', {
        userId,
        forecastAge,
      });

      // In a real implementation, you would:
      // 1. Retrieve historical forecasts from a forecasts table
      // 2. Compare with actual spending for those periods
      // 3. Calculate accuracy metrics

      return {
        accuracy: 0.78, // 78% accuracy placeholder
        meanError: 0.15, // 15% mean error placeholder
        forecastCount: 3, // Number of forecasts analyzed
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculating forecast accuracy', error);
      return { accuracy: 0, meanError: 0, forecastCount: 0 };
    }
  }

  /**
   * Get spending forecast for specific categories
   */
  static async getCategoryForecast(
    userId: string,
    category: string,
    days: number = 30
  ): Promise<SpendingForecast | null> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('category', category)
        .gte('transaction_date', startDate.toISOString());

      if (!transactions || transactions.length === 0) {
        return null;
      }

      const totalAmount = transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      const uniqueDays = new Set(
        transactions.map((t) => new Date(t.transaction_date).toDateString())
      ).size;

      if (uniqueDays === 0) return null;

      const dailyAverage = totalAmount / uniqueDays;
      const predictedAmount = dailyAverage * 30;

      // Lower confidence for category-specific forecasts
      const confidence = Math.min(0.7, 0.4 + transactions.length * 0.02);

      return {
        predicted_amount: Math.round(predictedAmount),
        confidence: Math.round(confidence * 100) / 100,
        trend: 'stable', // Simplified for category forecasts
        based_on_days: uniqueDays,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error generating category forecast', {
        category,
        error,
      });
      return null;
    }
  }
}
