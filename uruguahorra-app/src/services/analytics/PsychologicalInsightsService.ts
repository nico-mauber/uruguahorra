import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import {
  PsychologicalInsight,
  BasicRatios,
  SpendingPattern,
  MonthlyInsight,
} from './types';
import {
  ALL_INSIGHTS_CONFIG,
  CATEGORY_WEIGHTS,
  getTimeBasedBoost,
  InsightAnalysisData,
  InsightConfig,
} from './insights-config';

export class PsychologicalInsightsService {
  private static ratiosCache = new Map<
    string,
    { data: BasicRatios; timestamp: number }
  >();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

      // Get analysis data
      const analysisData = await this.prepareAnalysisData(
        userId,
        spendingPatterns,
        monthlyInsights
      );

      if (!analysisData) {
        logger.warn(
          LogModule.DB,
          'Insufficient data for psychological insights'
        );
        return [];
      }

      // Generate insights using configuration
      const generatedInsights = this.generateInsightsFromConfig(analysisData);

      // Score and select top insights
      const finalInsights = this.selectTopInsights(generatedInsights);

      logger.info(
        LogModule.DB,
        'Personalized psychological insights generated',
        {
          userId,
          totalGenerated: generatedInsights.length,
          finalSelected: finalInsights.length,
        }
      );

      return finalInsights;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error generating personalized insights',
        error
      );
      return [];
    }
  }

  /**
   * Prepare analysis data for insight generation
   */
  private static async prepareAnalysisData(
    userId: string,
    spendingPatterns: SpendingPattern[],
    monthlyInsights: MonthlyInsight[]
  ): Promise<InsightAnalysisData | null> {
    try {
      // Get transaction summary
      const { data: transactionSummary } = await supabase.rpc(
        'get_user_transaction_summary',
        { user_uuid: userId, days_back: 30 }
      );

      const summary = transactionSummary?.[0];
      if (!summary) return null;

      // Get or calculate basic ratios (with caching)
      const ratios = await this.getBasicRatios(userId);

      return {
        ratios,
        userId,
        totalExpenses: Number(summary.total_expenses) || 0,
        transactionCount: summary.transaction_count || 0,
        topCategory: summary.top_category || 'Sin datos',
        spendingTrend: summary.spending_trend || 'stable',
        monthlyInsights,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error preparing analysis data', error);
      return null;
    }
  }

  /**
   * Generate insights using configuration-based approach
   */
  private static generateInsightsFromConfig(
    analysisData: InsightAnalysisData
  ): PsychologicalInsight[] {
    const insights: PsychologicalInsight[] = [];

    for (const config of ALL_INSIGHTS_CONFIG) {
      try {
        // Check if conditions are met
        if (config.conditions(analysisData)) {
          const baseInsight = config.generator(analysisData);

          const insight: PsychologicalInsight = {
            type: config.type,
            category: config.category,
            priority: config.priority,
            confidence: config.confidence,
            healthScore: config.healthScore,
            ...baseInsight,
          };

          insights.push(insight);
        }
      } catch (error) {
        logger.warn(
          LogModule.DB,
          `Error generating insight ${config.type}`,
          error
        );
      }
    }

    return insights;
  }

  /**
   * Select top 3 insights using intelligent scoring
   */
  private static selectTopInsights(
    insights: PsychologicalInsight[]
  ): PsychologicalInsight[] {
    if (insights.length === 0) return [];

    // Score all insights
    const scoredInsights = insights.map((insight) => ({
      insight,
      score: this.calculateInsightScore(insight),
    }));

    // Sort by score (descending)
    scoredInsights.sort((a, b) => b.score - a.score);

    // Apply category diversity filter
    const selectedInsights = this.applyDiversityFilter(
      scoredInsights.map((s) => s.insight)
    );

    return selectedInsights.slice(0, 3);
  }

  /**
   * Calculate intelligent scoring for insights
   */
  private static calculateInsightScore(insight: PsychologicalInsight): number {
    const priorityScore = insight.priority || 10;
    const confidenceScore = (insight.confidence || 0.5) * 20;
    const healthScore = (insight.healthScore || 50) / 10;
    const impactScore =
      insight.impact === 'high' ? 15 : insight.impact === 'medium' ? 10 : 5;

    // Category boost with time-based adjustment
    const categoryBoost = CATEGORY_WEIGHTS[insight.category || 'other'] || 1;
    const timeBoost = getTimeBasedBoost(insight.category || 'other');

    // New insight mega boost (health, efficiency, motivation get priority)
    const newInsightTypes = [
      'balanced_spender',
      'income_utilization_optimizer',
      'savings_champion',
      'cash_flow_master',
      'expense_efficiency_master',
      'financial_runway_calculator',
    ];
    const newInsightBoost = newInsightTypes.includes(insight.type) ? 25 : 0;

    // Boost motivational insights (positive reinforcement)
    const motivationBoost =
      insight.impact === 'low' && insight.category === 'motivation' ? 5 : 0;

    return (
      priorityScore * 0.4 + // Priority weight
      confidenceScore * 0.25 + // Confidence in the insight
      healthScore * 0.15 + // Health score contribution
      impactScore * 0.1 + // Impact level
      categoryBoost * 0.05 + // Category preference
      timeBoost * 0.03 + // Time-based relevance
      motivationBoost * 0.02 + // Motivation boost
      newInsightBoost // Major boost for new insights
    );
  }

  /**
   * Apply diversity filter to avoid category clustering
   */
  private static applyDiversityFilter(
    insights: PsychologicalInsight[]
  ): PsychologicalInsight[] {
    const selected: PsychologicalInsight[] = [];
    const usedCategories = new Set<string>();

    // First pass: Select highest priority insights without category overlap
    for (const insight of insights) {
      if (selected.length >= 3) break;

      const category = insight.category || 'other';
      if (!usedCategories.has(category)) {
        selected.push(insight);
        usedCategories.add(category);
      }
    }

    // Second pass: Fill remaining slots with best remaining insights
    for (const insight of insights) {
      if (selected.length >= 3) break;
      if (!selected.includes(insight)) {
        selected.push(insight);
      }
    }

    return selected;
  }

  /**
   * Get basic ratios with caching for performance
   */
  private static async getBasicRatios(userId: string): Promise<BasicRatios> {
    // Check cache first
    const cached = this.ratiosCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Try enhanced analytics first
      const { data: enhanced } = await supabase.rpc(
        'get_enhanced_user_analytics',
        {
          user_uuid: userId,
          days_back: 30,
        }
      );

      let ratios: BasicRatios;

      if (enhanced?.[0] && Object.keys(enhanced[0]).length > 0) {
        ratios = enhanced[0];
      } else {
        // Fallback to manual calculation
        ratios = await this.calculateBasicRatios(userId);
      }

      // Cache the result
      this.ratiosCache.set(userId, { data: ratios, timestamp: Date.now() });

      return ratios;
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting basic ratios', error);
      return this.getDefaultRatios();
    }
  }

  /**
   * Calculate basic financial ratios manually
   */
  private static async calculateBasicRatios(
    userId: string
  ): Promise<BasicRatios> {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .gte(
          'transaction_date',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        );

      if (!transactions || transactions.length === 0) {
        return this.getDefaultRatios();
      }

      const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const cashFlow = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (cashFlow / totalIncome) * 100 : 0;
      const expenseRatio =
        totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

      return {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        cash_flow: cashFlow,
        savings_rate: savingsRate,
        expense_ratio: expenseRatio,
        income_utilization_score: expenseRatio / 20,
        weekend_expense_ratio: 25,
        lifestyle_inflation_rate: 5,
        income_growth_rate: 8,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculating basic ratios', error);
      return this.getDefaultRatios();
    }
  }

  /**
   * Get default ratios for fallback
   */
  private static getDefaultRatios(): BasicRatios {
    return {
      total_income: 0,
      total_expenses: 0,
      cash_flow: 0,
      savings_rate: 0,
      expense_ratio: 0,
      income_utilization_score: 0,
      weekend_expense_ratio: 25,
      lifestyle_inflation_rate: 5,
      income_growth_rate: 8,
    };
  }

  /**
   * Clear ratios cache (useful for testing or when data changes significantly)
   */
  static clearRatiosCache(userId?: string): void {
    if (userId) {
      this.ratiosCache.delete(userId);
    } else {
      this.ratiosCache.clear();
    }
  }

  /**
   * Get cache stats for debugging
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.ratiosCache.size,
      entries: Array.from(this.ratiosCache.keys()),
    };
  }
}
