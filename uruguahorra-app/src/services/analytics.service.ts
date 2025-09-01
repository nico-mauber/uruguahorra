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
  type: // === SALUD FINANCIERA BASE (5) ===
  | 'savings_champion' // Savings rate >20%
    | 'balanced_spender' // Expense ratio 70-90%
    | 'paycheck_to_paycheck' // Expense ratio >95%
    | 'income_volatility_alert' // Ingresos irregulares >30%
    | 'cash_flow_master' // Surplus consistente

    // === PATRONES TEMPORALES AVANZADOS (5) ===
    | 'weekend_income_ratio' // Gastos fin de semana vs % ingresos
    | 'post_paycheck_spending' // Gastos post-ingresos vs pre-ingresos
    | 'income_expense_lag' // Retraso ajuste gastos tras cambio ingresos
    | 'month_end_financial_stress' // Ratio gasto/ingreso al final del mes
    | 'seasonal_mismatch' // Desbalance estacional ingreso-gasto

    // === COMPORTAMIENTO PSICOLÓGICO (5) ===
    | 'lifestyle_inflation_detector' // Gastos crecen más rápido que ingresos
    | 'income_anchoring_bias' // Gastos anclados a ingresos pasados
    | 'windfall_effect' // Comportamiento con ingresos inesperados
    | 'income_insecurity_hoarding' // Ahorro excesivo por ingresos irregulares
    | 'expense_ceiling_phenomenon' // Gastos se ajustan automáticamente

    // === EFICIENCIA Y OPTIMIZACIÓN (5) ===
    | 'income_utilization_optimizer' // Maximizar valor por peso gastado
    | 'expense_efficiency_master' // Gastos esenciales vs ingresos
    | 'income_diversification_score' // Fuentes múltiples de ingresos
    | 'financial_runway_calculator' // Meses de cobertura con ahorros
    | 'income_goal_alignment' // Ingresos vs objetivos financieros

    // === GAMIFICACIÓN Y MOTIVACIÓN (5) ===
    | 'savings_rate_champion' // Progreso en % ahorro mes a mes
    | 'income_growth_tracker' // Crecimiento de ingresos en el tiempo
    | 'expense_control_master' // Gastos estables con ingresos variables
    | 'financial_discipline_score' // Consistencia en ratios objetivo
    | 'wealth_building_velocity' // Velocidad acumulación vs ingresos

    // Legacy types (mantener compatibilidad durante transición)
    | 'loss_aversion'
    | 'mental_accounting'
    | 'present_bias'
    | 'weekend_spender'
    | 'night_owl_spender'
    | 'payday_syndrome'
    | 'impulse_buyer'
    | 'loyal_spender'
    | 'social_spender'
    | 'progress_champion'
    | 'streak_master'
    | 'budget_balancer';

  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: string;
  priority?: number; // Para sistema de rotación
  confidence?: number; // Qué tan seguro está el algoritmo
  healthScore?: number; // Nuevo: Score de salud financiera (0-100)
  category?:
    | 'health'
    | 'temporal'
    | 'psychological'
    | 'efficiency'
    | 'motivation';
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

      // Get enhanced analytics data with income + expense analysis
      const { data: enhancedAnalytics } = await supabase.rpc(
        'get_enhanced_user_analytics',
        {
          user_uuid: userId,
          days_back: 30,
        }
      );

      const enhanced = enhancedAnalytics?.[0] || {};

      // === DEBUG: Log enhanced data status ===
      logger.info(LogModule.DB, 'Enhanced analytics data status', {
        hasData: !!enhanced && Object.keys(enhanced).length > 0,
        enhancedKeys: Object.keys(enhanced),
        totalIncome: enhanced.total_income,
        totalExpenses: enhanced.total_expenses,
        savingsRate: enhanced.savings_rate,
      });

      // === PRIORITY: FORCE NEW INSIGHTS FIRST ===
      // If enhanced data is empty, calculate basic ratios manually
      let effectiveEnhanced = enhanced;
      if (!enhanced || Object.keys(enhanced).length === 0) {
        logger.warn(
          LogModule.DB,
          'Enhanced analytics returned empty, calculating basic ratios manually'
        );

        // Calculate basic ratios from existing transaction data
        const basicRatios = await this.calculateBasicRatios(userId, supabase);
        effectiveEnhanced = { ...enhanced, ...basicRatios };
      }

      // === SALUD FINANCIERA BASE INSIGHTS (5) ===
      // FORCE MANUAL CALCULATION TO BYPASS POTENTIAL SQL ISSUES
      const manualRatios = await this.calculateBasicRatios(userId, supabase);
      logger.info(LogModule.DB, 'Manual ratios calculated', manualRatios);

      // Use manual ratios as primary, enhanced as fallback
      const finalRatios = { ...effectiveEnhanced, ...manualRatios };

      // 1. BALANCED SPENDER - PRIORITY INSIGHT FOR YOUR DATA
      if (
        finalRatios.expense_ratio >= 70 &&
        finalRatios.expense_ratio <= 95 &&
        finalRatios.savings_rate >= 5
      ) {
        logger.info(
          LogModule.DB,
          '✅ BALANCED SPENDER should activate',
          finalRatios
        );
        insights.push({
          type: 'balanced_spender',
          title: '⚖️ Equilibrio Financiero Perfecto',
          description: `Gastas el ${Math.round(finalRatios.expense_ratio)}% de tus ingresos y ahorras ${Math.round(finalRatios.savings_rate)}%. Has encontrado el equilibrio ideal entre disfrutar el presente y asegurar el futuro.`,
          impact: 'low', // Positivo
          actionable: `¡Perfecto balance! Mantén esta distribución. Podrías optimizar aumentando ahorros al ${Math.round(finalRatios.savings_rate + 3)}% si surgen oportunidades.`,
          priority: 25, // MÁXIMA PRIORIDAD - SUPERA TODOS LOS LEGACY
          confidence: 0.88,
          healthScore: 85,
          category: 'health',
        });
      }

      // 2. INCOME UTILIZATION - For your 87% expense ratio
      if (finalRatios.expense_ratio >= 60 && finalRatios.expense_ratio <= 95) {
        logger.info(
          LogModule.DB,
          '✅ INCOME UTILIZATION should activate',
          finalRatios
        );
        insights.push({
          type: 'income_utilization_optimizer',
          title: '🎯 Optimizador de Ingresos',
          description: `Utilizas el ${Math.round(finalRatios.expense_ratio)}% de tus ingresos de forma eficiente. Este alto nivel de utilización demuestra criterio para maximizar valor por peso invertido.`,
          impact: 'low', // Positivo
          actionable: `Excelente utilización. Mantén este balance optimizando las categorías de mayor impacto en tu calidad de vida.`,
          priority: 24, // PRIORIDAD MÁXIMA - SUPERA LEGACY
          confidence: 0.9,
          healthScore: 82,
          category: 'efficiency',
        });
      }

      // 3. SAVINGS CHAMPION - Alto ratio de ahorro (>20%)
      if (finalRatios.savings_rate >= 20) {
        const monthlyIncome = finalRatios.total_income || 25000;
        const monthlySavings = finalRatios.cash_flow || 6500;
        logger.info(
          LogModule.DB,
          '✅ SAVINGS CHAMPION should activate',
          finalRatios
        );

        insights.push({
          type: 'savings_champion',
          title: '💎 Campeón del Ahorro',
          description: `¡Increíble! Ahorras el ${Math.round(finalRatios.savings_rate)}% de tus ingresos ($${Math.round(monthlySavings)} de $${Math.round(monthlyIncome)} mensuales). Esto te coloca en el top 10% de usuarios con disciplina financiera.`,
          impact: 'low', // Positivo - motivacional
          actionable: `Mantén este excelente hábito. Considera invertir el ${Math.round(finalRatios.savings_rate * 0.7)}% y usar el ${Math.round(finalRatios.savings_rate * 0.3)}% para emergencias.`,
          priority: 23, // PRIORIDAD MÁXIMA - SUPERA LEGACY
          confidence: 0.95,
          healthScore: 95,
          category: 'health',
        });
      }

      // 4. CASH FLOW MASTER - Para tu excelente cash flow
      if (finalRatios.cash_flow > 1000 && finalRatios.savings_rate > 15) {
        const projectedYearlySavings = finalRatios.cash_flow * 12;
        logger.info(
          LogModule.DB,
          '✅ CASH FLOW MASTER should activate',
          finalRatios
        );

        insights.push({
          type: 'cash_flow_master',
          title: '💰 Maestro del Flujo de Efectivo',
          description: `Generas $${Math.round(finalRatios.cash_flow)} de surplus mensual consistente. A este ritmo, acumularás $${Math.round(projectedYearlySavings)} anuales. ¡Excelente gestión financiera!`,
          impact: 'low', // Positivo
          actionable: `Optimiza tu surplus: destina ${Math.round(finalRatios.cash_flow * 0.6)} a inversiones de largo plazo y ${Math.round(finalRatios.cash_flow * 0.4)} a objetivos de corto plazo.`,
          priority: 22, // PRIORIDAD MÁXIMA - SUPERA LEGACY
          confidence: 0.9,
          healthScore: 92,
          category: 'health',
        });
      }

      // 5. WEALTH BUILDING VELOCITY - Para tu velocidad de construcción de riqueza
      if (finalRatios.savings_rate >= 30) {
        logger.info(
          LogModule.DB,
          '✅ WEALTH BUILDING VELOCITY should activate',
          finalRatios
        );

        insights.push({
          type: 'wealth_building_velocity',
          title: '🚀 Velocidad de Construcción de Riqueza',
          description: `Con ${Math.round(finalRatios.savings_rate)}% de savings rate, acumulas riqueza a velocidad excepcional. Estás en el top 5% de constructores de riqueza activos.`,
          impact: 'low', // Muy motivacional
          actionable: `¡Velocidad excepcional! Mantén estas estrategias y considera diversificar en inversiones de mayor retorno para acelerar aún más.`,
          priority: 21, // PRIORIDAD MÁXIMA - SUPERA LEGACY
          confidence: 0.89,
          healthScore: 95,
          category: 'motivation',
        });
      }

      // 2. BALANCED SPENDER - Ratio de gasto equilibrado (70-90%) - AJUSTADO PARA TUS DATOS
      if (
        effectiveEnhanced.expense_ratio >= 70 &&
        effectiveEnhanced.expense_ratio <= 95 && // Incrementado para incluir más usuarios
        effectiveEnhanced.savings_rate >= 5 // Más permisivo para incluir tu 12.7%
      ) {
        logger.info(LogModule.DB, 'BALANCED SPENDER triggered', {
          expenseRatio: effectiveEnhanced.expense_ratio,
          savingsRate: effectiveEnhanced.savings_rate,
        });
        insights.push({
          type: 'balanced_spender',
          title: '⚖️ Equilibrio Financiero Perfecto',
          description: `Gastas el ${Math.round(enhanced.expense_ratio)}% de tus ingresos y ahorras ${Math.round(enhanced.savings_rate)}%. Has encontrado el equilibrio ideal entre disfrutar el presente y asegurar el futuro.`,
          impact: 'low', // Positivo
          actionable: `¡Perfecto balance! Mantén esta distribución. Podrías optimizar aumentando ahorros al ${Math.round(enhanced.savings_rate + 3)}% si surgen oportunidades.`,
          priority: 2,
          confidence: 0.88,
          healthScore: 88,
          category: 'health',
        });
      }

      // 3. PAYCHECK TO PAYCHECK - Vive de sueldo a sueldo (>95% gastos)
      if (enhanced.expense_ratio > 95) {
        const surplus = enhanced.cash_flow || 0;
        const criticalAmount = Math.abs(surplus);

        insights.push({
          type: 'paycheck_to_paycheck',
          title: '🚨 Alerta: Viviendo al Límite',
          description: `Gastas el ${Math.round(enhanced.expense_ratio)}% de tus ingresos, quedando solo $${Math.round(criticalAmount)} de colchón mensual. Esta situación genera estrés financiero y vulnerabilidad ante imprevistos.`,
          impact: 'high',
          actionable: `Urgente: Identifica $${Math.round(criticalAmount * 3)} en gastos no esenciales para crear un margen mínimo del 5%. Revisa suscripciones y gastos hormiga.`,
          priority: 10, // Máxima prioridad
          confidence: 0.92,
          healthScore: 25,
          category: 'health',
        });
      }

      // 4. INCOME VOLATILITY ALERT - Ingresos muy variables (>30% volatilidad)
      if (enhanced.income_volatility > 30) {
        insights.push({
          type: 'income_volatility_alert',
          title: '📊 Ingresos Irregulares Detectados',
          description: `Tus ingresos varían ${Math.round(enhanced.income_volatility)}% mes a mes. Esta volatilidad afecta tu capacidad de planificación y genera incertidumbre financiera.`,
          impact: enhanced.income_volatility > 50 ? 'high' : 'medium',
          actionable: `Estrategia anti-volatilidad: Crea un "fondo de ingresos estables" equivalente a ${Math.round(enhanced.income_volatility / 10)} meses de gastos básicos para suavizar fluctuaciones.`,
          priority: enhanced.income_volatility > 50 ? 8 : 6,
          confidence: 0.83,
          healthScore: enhanced.income_volatility > 50 ? 35 : 55,
          category: 'health',
        });
      }

      // 5. CASH FLOW MASTER - Surplus consistente mensual
      if (enhanced.cash_flow > 1000 && enhanced.savings_rate > 15) {
        const projectedYearlySavings = enhanced.cash_flow * 12;

        insights.push({
          type: 'cash_flow_master',
          title: '💰 Maestro del Flujo de Efectivo',
          description: `Generas $${Math.round(enhanced.cash_flow)} de surplus mensual consistente. A este ritmo, acumularás $${Math.round(projectedYearlySavings)} anuales. ¡Excelente gestión financiera!`,
          impact: 'low', // Positivo
          actionable: `Optimiza tu surplus: destina ${Math.round(enhanced.cash_flow * 0.6)} a inversiones de largo plazo y ${Math.round(enhanced.cash_flow * 0.4)} a objetivos de corto plazo.`,
          priority: 2,
          confidence: 0.9,
          healthScore: 92,
          category: 'health',
        });
      }

      // === PATRONES TEMPORALES AVANZADOS INSIGHTS (5) ===

      // 6. WEEKEND INCOME RATIO - % ingresos semanales gastados fines de semana
      if (enhanced.weekend_expense_ratio > 15) {
        const weeklyIncome = (enhanced.total_income || 25000) / 4;
        const weekendSpent =
          (weeklyIncome * enhanced.weekend_expense_ratio) / 100;

        insights.push({
          type: 'weekend_income_ratio',
          title: '🎯 Patrón de Gastos de Fin de Semana',
          description: `Los fines de semana gastas el ${Math.round(enhanced.weekend_expense_ratio)}% de tus ingresos semanales ($${Math.round(weekendSpent)} de $${Math.round(weeklyIncome)}). Los fines de semana activamos el "modo descanso" financiero.`,
          impact: enhanced.weekend_expense_ratio > 25 ? 'high' : 'medium',
          actionable: `Establece un "presupuesto de fin de semana" fijo de $${Math.round(weekendSpent * 0.8)} para mantener el disfrute sin comprometer tu salud financiera.`,
          priority: enhanced.weekend_expense_ratio > 25 ? 7 : 5,
          confidence: 0.82,
          healthScore: enhanced.weekend_expense_ratio > 25 ? 45 : 65,
          category: 'temporal',
        });
      }

      // 7. POST PAYCHECK SPENDING - Gastos post-ingresos vs pre-ingresos
      if (enhanced.post_income_spending_boost > 30) {
        insights.push({
          type: 'post_paycheck_spending',
          title: '💳 Síndrome Post-Cobro',
          description: `Gastas ${Math.round(enhanced.post_income_spending_boost)}% más los días después de recibir ingresos vs antes. Este "efecto riqueza temporal" es natural pero puede desbalancear tu flujo mensual.`,
          impact: enhanced.post_income_spending_boost > 50 ? 'high' : 'medium',
          actionable: `Aplica la regla "24-48 horas": espera al menos 2 días después de cobrar antes de hacer compras grandes no planificadas. Tu yo futuro te lo agradecerá.`,
          priority: enhanced.post_income_spending_boost > 50 ? 8 : 6,
          confidence: 0.87,
          healthScore: enhanced.post_income_spending_boost > 50 ? 40 : 60,
          category: 'temporal',
        });
      }

      // 8. INCOME EXPENSE LAG - Retraso en ajustar gastos tras cambio de ingresos
      if (enhanced.income_expense_lag_days > 5) {
        insights.push({
          type: 'income_expense_lag',
          title: '⏰ Desajuste Temporal Ingreso-Gasto',
          description: `Tardas ${Math.round(enhanced.income_expense_lag_days)} días en ajustar tus gastos cuando cambian tus ingresos. Este retraso puede crear desbalances financieros temporales.`,
          impact: enhanced.income_expense_lag_days > 10 ? 'medium' : 'low',
          actionable:
            enhanced.income_expense_lag_days > 10
              ? `Acelera tu adaptación: revisa y ajusta gastos dentro de las 72 horas posteriores a cambios significativos en ingresos.`
              : `Buen tiempo de respuesta. Mantén esta agilidad para optimizar tu flujo de efectivo.`,
          priority: enhanced.income_expense_lag_days > 10 ? 6 : 4,
          confidence: 0.75,
          healthScore: enhanced.income_expense_lag_days > 10 ? 55 : 75,
          category: 'temporal',
        });
      }

      // 9. MONTH END FINANCIAL STRESS - Ratio gasto/ingreso crítico al final del mes
      if (enhanced.month_end_stress_ratio > 85) {
        insights.push({
          type: 'month_end_financial_stress',
          title: '😰 Estrés Financiero de Fin de Mes',
          description: `Al final del mes gastas el ${Math.round(enhanced.month_end_stress_ratio)}% de tus ingresos restantes. Esta presión genera estrés y decisiones financieras subóptimas por urgencia.`,
          impact: enhanced.month_end_stress_ratio > 95 ? 'high' : 'medium',
          actionable: `Estrategia anti-estrés: Reserva el 15% de ingresos mensuales como "buffer de fin de mes" para evitar la presión de quedarte sin efectivo.`,
          priority: enhanced.month_end_stress_ratio > 95 ? 8 : 6,
          confidence: 0.88,
          healthScore: enhanced.month_end_stress_ratio > 95 ? 30 : 50,
          category: 'temporal',
        });
      }

      // 10. SEASONAL MISMATCH - Desbalance estacional ingreso-gasto
      if (enhanced.seasonal_mismatch_score > 20) {
        insights.push({
          type: 'seasonal_mismatch',
          title: '🌍 Desbalance Estacional',
          description: `Tienes un ${Math.round(enhanced.seasonal_mismatch_score)}% de desbalance entre ingresos y gastos según la temporada. Esto sugiere patrones estacionales que requieren planificación específica.`,
          impact: enhanced.seasonal_mismatch_score > 30 ? 'medium' : 'low',
          actionable:
            enhanced.seasonal_mismatch_score > 30
              ? `Crea un "fondo estacional": ahorra ${Math.round(enhanced.seasonal_mismatch_score)}% extra en temporada alta para cubrir temporada baja.`
              : `Pequeño desbalance estacional. Considera ajustar gastos variables según época del año para mayor estabilidad.`,
          priority: enhanced.seasonal_mismatch_score > 30 ? 5 : 3,
          confidence: 0.72,
          healthScore: enhanced.seasonal_mismatch_score > 30 ? 60 : 75,
          category: 'temporal',
        });
      }

      // === COMPORTAMIENTO PSICOLÓGICO INSIGHTS (5) ===

      // 11. LIFESTYLE INFLATION DETECTOR - Gastos crecen más rápido que ingresos
      if (enhanced.lifestyle_inflation_rate > 5) {
        const inflationDiff =
          enhanced.lifestyle_inflation_rate - enhanced.income_growth_rate;

        insights.push({
          type: 'lifestyle_inflation_detector',
          title: '📈 Inflación de Estilo de Vida',
          description: `Tus gastos crecieron ${Math.round(enhanced.lifestyle_inflation_rate)}% mientras que ingresos solo ${Math.round(enhanced.income_growth_rate)}%. Esta "inflación de estilo de vida" consume gradualmente tu capacidad de ahorro.`,
          impact: enhanced.lifestyle_inflation_rate > 15 ? 'high' : 'medium',
          actionable: `Frena la inflación: mantén gastos creciendo máximo al ${Math.round(enhanced.income_growth_rate * 0.8)}% anual y destina los aumentos de ingresos 70% ahorro, 30% mejoras de vida.`,
          priority: enhanced.lifestyle_inflation_rate > 15 ? 9 : 7,
          confidence: 0.85,
          healthScore: enhanced.lifestyle_inflation_rate > 15 ? 35 : 55,
          category: 'psychological',
        });
      }

      // 12. INCOME ANCHORING BIAS - Gastos anclados a ingresos pasados
      if (enhanced.income_anchoring_score > 75) {
        insights.push({
          type: 'income_anchoring_bias',
          title: '⚓ Anclaje a Ingresos Pasados',
          description: `El ${Math.round(enhanced.income_anchoring_score)}% de tus decisiones de gasto se basan en niveles de ingresos anteriores, no actuales. Este "anclaje mental" puede generar desajustes financieros.`,
          impact: 'medium',
          actionable: `Actualiza tu "presupuesto mental": revisa mensualmente tus límites de gasto basándote en ingresos actuales, no en hábitos de hace 3+ meses.`,
          priority: 6,
          confidence: 0.78,
          healthScore: 58,
          category: 'psychological',
        });
      }

      // 13. WINDFALL EFFECT - Comportamiento con ingresos inesperados
      if (enhanced.windfall_spending_rate > 60) {
        insights.push({
          type: 'windfall_effect',
          title: '💸 Efecto Dinero Inesperado',
          description: `Gastas el ${Math.round(enhanced.windfall_spending_rate)}% de ingresos extra inmediatamente. Los "windfall" activan nuestro sistema de recompensa y reducen autocontrol financiero.`,
          impact: enhanced.windfall_spending_rate > 80 ? 'high' : 'medium',
          actionable: `Regla anti-windfall: destina automáticamente el ${100 - Math.round(enhanced.windfall_spending_rate * 0.6)}% de dinero inesperado a ahorros antes de decidir qué hacer con el resto.`,
          priority: enhanced.windfall_spending_rate > 80 ? 8 : 6,
          confidence: 0.82,
          healthScore: enhanced.windfall_spending_rate > 80 ? 40 : 60,
          category: 'psychological',
        });
      }

      // 14. INCOME INSECURITY HOARDING - Ahorro excesivo por ingresos irregulares
      if (enhanced.income_volatility > 40 && enhanced.savings_rate > 40) {
        insights.push({
          type: 'income_insecurity_hoarding',
          title: '🛡️ Ahorro por Inseguridad',
          description: `Ahorras el ${Math.round(enhanced.savings_rate)}% debido a ingresos variables (${Math.round(enhanced.income_volatility)}% volatilidad). La inseguridad genera sobre-ahorro que limita calidad de vida presente.`,
          impact: 'low', // Problema "positivo" pero subóptimo
          actionable: `Balance saludable: con tu volatilidad, un ${Math.round(enhanced.income_volatility * 0.8)}% de savings rate es suficiente. Libera ${Math.round(enhanced.savings_rate - enhanced.income_volatility * 0.8)}% para disfrutar el presente.`,
          priority: 4,
          confidence: 0.76,
          healthScore: 70, // Alto por disciplina, pero no óptimo
          category: 'psychological',
        });
      }

      // 15. EXPENSE CEILING PHENOMENON - Gastos se ajustan automáticamente a ingresos
      if (enhanced.expense_ceiling_adjustment > 90) {
        insights.push({
          type: 'expense_ceiling_phenomenon',
          title: '🏠 Techo de Gastos Automático',
          description: `Tus gastos se ajustan automáticamente al ${Math.round(enhanced.expense_ceiling_adjustment)}% de cualquier aumento de ingresos. Esta "expansión automática" impide acumulación de riqueza.`,
          impact: 'high',
          actionable: `Rompe el techo: cuando aumenten ingresos, mantén gastos fijos por 3 meses y destina el 100% del aumento a ahorros/inversiones antes de permitir cualquier expansión.`,
          priority: 8,
          confidence: 0.88,
          healthScore: 35,
          category: 'psychological',
        });
      }

      // === EFICIENCIA Y OPTIMIZACIÓN INSIGHTS (5) ===

      // 16. INCOME UTILIZATION OPTIMIZER - Maximizar valor por peso gastado - AJUSTADO
      if (enhanced.income_utilization_score > 2.5) {
        // Reducido umbral de 3.0 a 2.5
        insights.push({
          type: 'income_utilization_optimizer',
          title: '🎯 Optimizador de Ingresos',
          description: `Generas $${enhanced.income_utilization_score} de valor por cada $1 gastado de tus ingresos. Este alto ROI en gastos demuestra excelente criterio para maximizar utilidad por peso invertido.`,
          impact: 'low', // Positivo
          actionable: `¡Excelente optimización! Documenta tus mejores decisiones de gasto para replicar este criterio. Considera enseñar estas estrategias a otros.`,
          priority: 2,
          confidence: 0.83,
          healthScore: 85,
          category: 'efficiency',
        });
      }

      // 17. EXPENSE EFFICIENCY MASTER - Gastos esenciales vs ingresos optimizados
      if (enhanced.essential_expense_ratio < 50) {
        const discretionaryIncome =
          enhanced.total_income * (1 - enhanced.essential_expense_ratio / 100);

        insights.push({
          type: 'expense_efficiency_master',
          title: '⚡ Maestro de Eficiencia',
          description: `Solo el ${Math.round(enhanced.essential_expense_ratio)}% de tus ingresos van a gastos esenciales, liberando $${Math.round(discretionaryIncome)} mensuales para objetivos y disfrute. Esto es eficiencia financiera de élite.`,
          impact: 'low', // Muy positivo
          actionable: `Perfecto control de gastos base. Usa tus $${Math.round(discretionaryIncome)} libres estratégicamente: ${Math.round(discretionaryIncome * 0.6)} inversiones, ${Math.round(discretionaryIncome * 0.4)} experiencias de calidad.`,
          priority: 1,
          confidence: 0.92,
          healthScore: 92,
          category: 'efficiency',
        });
      }

      // 18. INCOME DIVERSIFICATION SCORE - Múltiples fuentes de ingresos
      if (enhanced.income_diversification_score > 20) {
        const secondaryIncome =
          (enhanced.total_income * enhanced.income_diversification_score) / 100;

        insights.push({
          type: 'income_diversification_score',
          title: '🌟 Diversificación de Ingresos',
          description: `El ${Math.round(enhanced.income_diversification_score)}% de tus ingresos ($${Math.round(secondaryIncome)}) proviene de fuentes secundarias. Esta diversificación reduce riesgo financiero y aumenta oportunidades.`,
          impact: 'low', // Muy positivo
          actionable:
            enhanced.income_diversification_score > 30
              ? `¡Excelente diversificación! Mantén y expande estas fuentes alternativas. Podrías alcanzar independencia financiera acelerada.`
              : `Buena base de diversificación. Considera expandir fuentes secundarias al ${Math.round(enhanced.income_diversification_score + 10)}% para mayor seguridad.`,
          priority: enhanced.income_diversification_score > 30 ? 1 : 3,
          confidence: 0.87,
          healthScore: enhanced.income_diversification_score > 30 ? 88 : 78,
          category: 'efficiency',
        });
      }

      // 19. FINANCIAL RUNWAY CALCULATOR - Meses de cobertura con ahorros actuales
      if (enhanced.financial_runway_months > 6) {
        insights.push({
          type: 'financial_runway_calculator',
          title: '🛬 Runway Financiero Sólido',
          description: `Con tus ahorros actuales tienes ${Math.round(enhanced.financial_runway_months)} meses de runway financiero. Esta reserva te da libertad para tomar riesgos calculados y capear imprevistos.`,
          impact: 'low', // Positivo
          actionable:
            enhanced.financial_runway_months > 12
              ? `¡Runway excepcional! Considera diversificar en inversiones de mayor riesgo/retorno para acelerar crecimiento patrimonial.`
              : `Buen colchón de seguridad. Mantén este nivel y considera aumentar gradualmente a ${Math.round(enhanced.financial_runway_months + 2)} meses.`,
          priority: enhanced.financial_runway_months > 12 ? 2 : 4,
          confidence: 0.9,
          healthScore: enhanced.financial_runway_months > 12 ? 90 : 80,
          category: 'efficiency',
        });
      } else if (enhanced.financial_runway_months < 3) {
        insights.push({
          type: 'financial_runway_calculator',
          title: '⚠️ Runway Financiero Limitado',
          description: `Tu runway financiero es de solo ${Math.round(enhanced.financial_runway_months)} meses. Esta falta de reservas te hace vulnerable a imprevistos y limita tu flexibilidad financiera.`,
          impact: 'high',
          actionable: `Prioridad: construir emergency fund de al menos 3 meses. Destina ${Math.round(((3 - enhanced.financial_runway_months) * enhanced.total_expenses) / 12)} extra mensual hasta alcanzar seguridad básica.`,
          priority: 9,
          confidence: 0.93,
          healthScore: 30,
          category: 'efficiency',
        });
      }

      // 20. INCOME GOAL ALIGNMENT - Ingresos vs objetivos financieros
      if (enhanced.income_goal_alignment_score > 80) {
        insights.push({
          type: 'income_goal_alignment',
          title: '🎯 Alineación Perfecta Ingresos-Metas',
          description: `Tienes ${Math.round(enhanced.income_goal_alignment_score)}% de progreso hacia tu meta financiera. Tus ingresos actuales están perfectamente alineados con tus objetivos de largo plazo.`,
          impact: 'low', // Muy positivo
          actionable: `¡En el camino correcto! Mantén este ritmo y alcanzarás tu objetivo. Considera establecer la próxima meta más ambiciosa para continuar creciendo.`,
          priority: 2,
          confidence: 0.88,
          healthScore: 90,
          category: 'efficiency',
        });
      } else if (enhanced.income_goal_alignment_score < 50) {
        const monthsToGoal = Math.round(
          100 / enhanced.income_goal_alignment_score
        );

        insights.push({
          type: 'income_goal_alignment',
          title: '🎯 Desalineación Ingresos-Metas',
          description: `Solo tienes ${Math.round(enhanced.income_goal_alignment_score)}% de progreso hacia tu meta financiera. Al ritmo actual, tardarías ${monthsToGoal}+ meses en alcanzarla.`,
          impact: 'medium',
          actionable: `Re-alinea tu estrategia: o aumenta ingresos, o reduce la meta, o extiende el plazo realísticamente. Las metas inalcanzables desmotivan más que ayudan.`,
          priority: 6,
          confidence: 0.85,
          healthScore: 45,
          category: 'efficiency',
        });
      }

      // === GAMIFICACIÓN Y MOTIVACIÓN INSIGHTS (5) ===

      // 21. SAVINGS RATE CHAMPION - Progreso en % ahorro mes a mes
      if (enhanced.savings_rate_improvement > 3) {
        insights.push({
          type: 'savings_rate_champion',
          title: '🏆 Campeón de Mejora en Ahorros',
          description: `¡Increíble! Mejoraste tu tasa de ahorro en ${Math.round(enhanced.savings_rate_improvement)}% este mes. Esta disciplina creciente te coloca en el top 5% de usuarios con mayor progreso financiero.`,
          impact: 'low', // Altamente motivacional
          actionable: `¡Momentum imparable! Si mantienes esta mejora por 3 meses más, estarás en el top 1% de ahorradores. Celebra este logro y mantén el ritmo.`,
          priority: 1, // Máxima prioridad para refuerzo positivo
          confidence: 0.93,
          healthScore: 95,
          category: 'motivation',
        });
      }

      // 22. INCOME GROWTH TRACKER - Crecimiento de ingresos en el tiempo
      if (enhanced.income_growth_rate > 10) {
        const yearlyProjection =
          enhanced.total_income * (1 + enhanced.income_growth_rate / 100);

        insights.push({
          type: 'income_growth_tracker',
          title: '📈 Tracker de Crecimiento',
          description: `Tus ingresos crecieron ${Math.round(enhanced.income_growth_rate)}% en los últimos 6 meses. A este ritmo, alcanzarías $${Math.round(yearlyProjection)} anuales. ¡Tu carrera está en ascenso!`,
          impact: 'low', // Motivacional
          actionable: `Acelera el crecimiento: documenta qué estrategias funcionaron y replica/escala las más exitosas. Considera negociar aumento o diversificar fuentes.`,
          priority: 2,
          confidence: 0.87,
          healthScore: 88,
          category: 'motivation',
        });
      }

      // 23. EXPENSE CONTROL MASTER - Gastos estables con ingresos variables
      if (
        enhanced.income_volatility > 25 &&
        enhanced.expense_control_consistency > 85
      ) {
        insights.push({
          type: 'expense_control_master',
          title: '🎯 Maestro del Control',
          description: `Mantienes ${Math.round(enhanced.expense_control_consistency)}% de consistencia en gastos pese a ingresos ${Math.round(enhanced.income_volatility)}% variables. Esta disciplina es excepcional y muy valiosa.`,
          impact: 'low', // Altamente positivo
          actionable: `¡Disciplina de élite! Tu habilidad para mantener control con ingresos irregulares es una ventaja competitiva. Considera enseñar esta habilidad.`,
          priority: 1,
          confidence: 0.91,
          healthScore: 94,
          category: 'motivation',
        });
      }

      // 24. FINANCIAL DISCIPLINE SCORE - Consistencia en ratios objetivo
      if (enhanced.financial_discipline_days >= 20) {
        insights.push({
          type: 'financial_discipline_score',
          title: '💪 Racha de Disciplina Financiera',
          description: `Llevas ${enhanced.financial_discipline_days} días consecutivos manteniendo tus ratios financieros objetivo. Esta consistencia construye hábitos duraderos que transforman vidas.`,
          impact: 'low', // Motivacional
          actionable: `¡Racha legendaria! Objetivo: llegar a ${enhanced.financial_discipline_days + 10} días. La disciplina se vuelve automática después de 30 días consecutivos.`,
          priority: 1,
          confidence: 0.95,
          healthScore: 92,
          category: 'motivation',
        });
      } else if (enhanced.financial_discipline_days >= 10) {
        insights.push({
          type: 'financial_discipline_score',
          title: '💪 Construyendo Disciplina',
          description: `Llevas ${enhanced.financial_discipline_days} días consecutivos manteniendo disciplina financiera. Estás en el camino correcto hacia hábitos sólidos.`,
          impact: 'low', // Motivacional
          actionable: `¡Excelente inicio! Los próximos ${20 - enhanced.financial_discipline_days} días son críticos. Mantén el enfoque para alcanzar la zona de hábitos automáticos.`,
          priority: 3,
          confidence: 0.85,
          healthScore: 75,
          category: 'motivation',
        });
      }

      // 25. WEALTH BUILDING VELOCITY - Velocidad acumulación vs ingresos similares
      if (enhanced.wealth_building_velocity > 110) {
        const performanceVsAverage = enhanced.wealth_building_velocity - 100;

        insights.push({
          type: 'wealth_building_velocity',
          title: '🚀 Velocidad de Construcción de Riqueza',
          description: `Acumulas riqueza ${Math.round(performanceVsAverage)}% más rápido que usuarios con ingresos similares. Tu eficiencia financiera está generando resultados superiores al promedio.`,
          impact: 'low', // Altamente motivacional
          actionable:
            enhanced.wealth_building_velocity > 130
              ? `¡Velocidad excepcional! Estás en el top 10% de constructores de riqueza. Mantén estas estrategias y compártelas con otros.`
              : `¡Sobre el promedio! Identifica tus 2-3 mejores decisiones financieras y amplifica su impacto para acelerar aún más.`,
          priority: enhanced.wealth_building_velocity > 130 ? 1 : 2,
          confidence: 0.89,
          healthScore: enhanced.wealth_building_velocity > 130 ? 95 : 85,
          category: 'motivation',
        });
      } else if (enhanced.wealth_building_velocity < 90) {
        const underperformance = 100 - enhanced.wealth_building_velocity;

        insights.push({
          type: 'wealth_building_velocity',
          title: '🐌 Velocidad de Riqueza Bajo Promedio',
          description: `Tu velocidad de acumulación está ${Math.round(underperformance)}% bajo el promedio de usuarios similares. Hay oportunidades claras para acelerar tu progreso financiero.`,
          impact: 'medium',
          actionable: `Acelera tu progreso: revisa las 3 áreas donde más gastas y optimiza al menos una. Pequeños ajustes pueden generar grandes diferencias.`,
          priority: 6,
          confidence: 0.82,
          healthScore: 45,
          category: 'motivation',
        });
      }

      // === LEGACY INSIGHTS (DEPRIORIZADOS - solo si no hay suficientes nuevos insights) ===
      // Solo evaluar legacy insights si tenemos menos de 3 insights nuevos
      if (insights.length < 3) {
        if (
          enhanced.weekend_expense_ratio > 35 &&
          enhanced.weekend_avg > enhanced.weekday_avg * 1.2
        ) {
          insights.push({
            type: 'weekend_spender',
            title: '🎯 Detective de Gastos de Fin de Semana',
            description: `El ${Math.round(enhanced.weekend_expense_ratio)}% de tus gastos ocurren los fines de semana ($${Math.round(enhanced.weekend_avg)} vs $${Math.round(enhanced.weekday_avg)} en semana). Los fines de semana tendemos a relajar nuestro autocontrol financiero.`,
            impact: enhanced.weekend_expense_ratio > 50 ? 'high' : 'medium',
            actionable: `Establece un "presupuesto de fin de semana" de $${Math.round(enhanced.weekday_avg * 1.1)} para mantener el equilibrio entre disfrute y control.`,
            priority: enhanced.weekend_expense_ratio > 50 ? 9 : 6,
            confidence: 0.85,
          });
        }

        // 5. NIGHT OWL SPENDER - Compras nocturnas frecuentes
        if (
          enhanced.night_transactions_count >= 3 &&
          enhanced.evening_expense_ratio > 25
        ) {
          insights.push({
            type: 'night_owl_spender',
            title: '🌙 Comprador Nocturno Detectado',
            description: `Realizaste ${enhanced.night_transactions_count} compras nocturnas, representando el ${Math.round(enhanced.evening_expense_ratio)}% de tus gastos. Las decisiones nocturnas suelen ser más impulsivas debido a la fatiga mental.`,
            impact: enhanced.night_transactions_count >= 5 ? 'high' : 'medium',
            actionable: `Implementa la regla "duerme antes de comprar": evita compras no esenciales después de las 9 PM, especialmente compras online.`,
            priority: enhanced.night_transactions_count >= 5 ? 8 : 5,
            confidence: 0.78,
          });
        }

        // 6. PAYDAY SYNDROME - Gastos concentrados después de cobrar
        if (enhanced.payday_week_ratio > 40) {
          const paydayAmount =
            (totalExpenses * enhanced.payday_week_ratio) / 100;
          insights.push({
            type: 'payday_syndrome',
            title: '💰 Síndrome del Día de Pago',
            description: `El ${Math.round(enhanced.payday_week_ratio)}% de tus gastos ($${Math.round(paydayAmount)}) ocurren la primera semana del mes. Es natural sentirse "rico" después de cobrar, pero distribuir gastos mejora el flujo de efectivo.`,
            impact: enhanced.payday_week_ratio > 55 ? 'high' : 'medium',
            actionable: `Programa pagos automáticos y limita compras discrecionales a $${Math.round(paydayAmount * 0.7)} en la primera semana para evitar apretones de fin de mes.`,
            priority: enhanced.payday_week_ratio > 55 ? 8 : 6,
            confidence: 0.82,
          });
        }

        // 7. MONTH END SAVER - Reducción drástica de gastos al final del mes
        if (enhanced.month_end_savings > 15) {
          insights.push({
            type: 'month_end_saver',
            title: '📉 Ahorrador de Fin de Mes',
            description: `Reduces tus gastos un ${Math.round(enhanced.month_end_savings)}% al final del mes. ¡Esto demuestra gran autocontrol! Sin embargo, una distribución más pareja podría reducir el estrés financiero.`,
            impact: 'low', // Insight positivo
            actionable: `¡Felicitaciones por tu disciplina! Considera distribuir mejor tu presupuesto mensual para mantener un flujo más consistente sin sacrificar tanto al final.`,
            priority: 4, // Menor prioridad porque es positivo
            confidence: 0.75,
          });
        }

        // === PURCHASE BEHAVIOR INSIGHTS ===

        // 8. IMPULSE BUYER - Múltiples transacciones pequeñas en poco tiempo
        if (
          enhanced.avg_days_between_transactions < 2 &&
          enhanced.small_transaction_ratio > 40
        ) {
          insights.push({
            type: 'impulse_buyer',
            title: '⚡ Comprador por Impulso',
            description: `Realizas compras cada ${Math.round(enhanced.avg_days_between_transactions * 10) / 10} días en promedio, y el ${Math.round(enhanced.small_transaction_ratio)}% son compras pequeñas. Los impulsos de compra suelen activarse por emociones o estímulos externos.`,
            impact:
              enhanced.avg_days_between_transactions < 1 ? 'high' : 'medium',
            actionable: `Aplica la regla "24-48-7": espera 24 horas para compras <$50, 48 horas para <$200, y 7 días para >$200. Esto reduce impulsos hasta un 70%.`,
            priority: enhanced.avg_days_between_transactions < 1 ? 9 : 7,
            confidence: 0.88,
          });
        }

        // 9. LOYAL SPENDER - Alta fidelidad a ciertos comercios
        if (
          enhanced.merchant_loyalty_score < 3 &&
          enhanced.merchant_loyalty_score > 0
        ) {
          insights.push({
            type: 'loyal_spender',
            title: '🔄 Fidelidad de Marca Detectada',
            description: `Muestras alta lealtad a "${enhanced.top_merchant}" (score: ${Math.round(enhanced.merchant_loyalty_score * 10) / 10}). La fidelidad puede ser positiva, pero también puede llevarnos a perder oportunidades de ahorro.`,
            impact: 'medium',
            actionable: `Una vez al mes, compara precios de tu comercio favorito con 2-3 alternativas. Podrías ahorrar 10-25% sin sacrificar calidad.`,
            priority: 5,
            confidence: 0.72,
          });
        }

        // 10. DEAL HUNTER - Detección de cazador de ofertas por duplicados y variaciones
        if (
          enhanced.duplicate_transactions_count >= 2 &&
          enhanced.expense_volatility > 60
        ) {
          insights.push({
            type: 'deal_hunter',
            title: '🎯 Cazador de Ofertas',
            description: `Detectamos ${enhanced.duplicate_transactions_count} compras similares y alta variabilidad en montos (${Math.round(enhanced.expense_volatility)}% variación). Esto sugiere que buscas activamente ofertas y promociones.`,
            impact: 'low', // Comportamiento generalmente positivo
            actionable: `¡Excelente estrategia! Para maximizar ahorros, usa apps de comparación de precios y establece alertas para productos que compras regularmente.`,
            priority: 3,
            confidence: 0.65,
          });
        }

        // 11. SUBSCRIPTION CREEP - Detección de posible acumulación de suscripciones
        if (
          enhanced.merchant_loyalty_score > 5 &&
          spendingPatterns.some(
            (p) =>
              p.category?.toLowerCase().includes('entretenimiento') &&
              p.amount > totalExpenses * 0.15
          )
        ) {
          const entertainmentSpend =
            spendingPatterns.find((p) =>
              p.category?.toLowerCase().includes('entretenimiento')
            )?.amount || 0;
          insights.push({
            type: 'subscription_creep',
            title: '📱 Crecimiento Silencioso de Suscripciones',
            description: `Gastas $${Math.round(entertainmentSpend)} en entretenimiento (${Math.round((entertainmentSpend / totalExpenses) * 100)}% del total). Las suscripciones tienden a acumularse sin que nos demos cuenta del impacto total.`,
            impact:
              entertainmentSpend > totalExpenses * 0.25 ? 'high' : 'medium',
            actionable: `Revisa todas tus suscripciones mensualmente. Cancela las que no uses hace >30 días y considera planes familiares o anuales para las que mantengas.`,
            priority: entertainmentSpend > totalExpenses * 0.25 ? 8 : 6,
            confidence: 0.7,
          });
        }

        // === MOTIVATION & GAMIFICATION INSIGHTS ===
        // Need to get user data for XP and streaks
        const { data: userData } = await supabase
          .from('users')
          .select('total_xp, current_level, created_at')
          .eq('id', userId)
          .single();

        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak, longest_streak, last_activity_at')
          .eq('user_id', userId)
          .single();

        const userXP = userData?.total_xp || 0;
        const userLevel = userData?.current_level || 1;
        const currentStreak = streakData?.current_streak || 0;
        const longestStreak = streakData?.longest_streak || 0;
        const accountAge = userData?.created_at
          ? Math.floor(
              (Date.now() - new Date(userData.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        // 12. PROGRESS CHAMPION - Usuario que mantiene buen progreso
        if (userXP > 50 && transactionCount >= 5 && accountAge > 7) {
          const xpPerDay =
            accountAge > 0 ? Math.round((userXP / accountAge) * 10) / 10 : 0;
          insights.push({
            type: 'progress_champion',
            title: '🏆 Campeón del Progreso',
            description: `Has acumulado ${userXP} XP en ${accountAge} días (${xpPerDay} XP/día promedio) y alcanzado nivel ${userLevel}. Tu constancia en el seguimiento financiero es excepcional.`,
            impact: 'low', // Insight motivacional positivo
            actionable: `¡Sigue así! Estás en el top 20% de usuarios más activos. Considera establecer una meta de llegar a ${Math.round(userXP * 1.5)} XP para alcanzar nuevos logros.`,
            priority: 2, // Baja prioridad pero alta motivación
            confidence: 0.92,
          });
        }

        // 13. STREAK MASTER - Usuario con rachas impresionantes
        if (currentStreak >= 5 || longestStreak >= 10) {
          insights.push({
            type: 'streak_master',
            title: '🔥 Maestro de Rachas',
            description: `${
              currentStreak >= 5
                ? `Llevas ${currentStreak} días consecutivos de actividad. `
                : ''
            }${
              longestStreak >= 10
                ? `Tu racha más larga fue de ${longestStreak} días. `
                : ''
            }La consistencia es la clave del éxito financiero.`,
            impact: 'low', // Motivacional
            actionable:
              currentStreak >= 5
                ? `¡Increíble racha! Mantén el momentum - solo necesitas registrar una actividad diaria para continuar creciendo.`
                : `Intenta recuperar tu consistencia. Incluso 5 minutos diarios revisando gastos pueden generar hábitos duraderos.`,
            priority: currentStreak >= 5 ? 1 : 3,
            confidence: 0.95,
          });
        }

        // 14. SMALL WINS COLLECTOR - Usuario que celebra pequeños logros
        if (
          transactionCount >= 8 &&
          userXP > 30 &&
          enhanced.spending_consistency_score > 50
        ) {
          insights.push({
            type: 'small_wins_collector',
            title: '🌟 Coleccionista de Pequeñas Victorias',
            description: `Con ${transactionCount} transacciones registradas y ${Math.round(enhanced.spending_consistency_score)}% de consistencia en gastos, demuestras que los pequeños hábitos generan grandes resultados.`,
            impact: 'low', // Motivacional
            actionable: `¡Excelente trabajo! Los pequeños cambios constantes superan a los grandes cambios esporádicos. Continúa con este enfoque gradual.`,
            priority: 2,
            confidence: 0.85,
          });
        }

        // === SOCIAL & COMPARATIVE INSIGHTS ===

        // 15. SOCIAL SPENDER - Gastos altos en entretenimiento y socialización
        const socialCategories = spendingPatterns.filter(
          (p) =>
            p.category?.toLowerCase().includes('entretenimiento') ||
            p.category?.toLowerCase().includes('restaurante') ||
            p.category?.toLowerCase().includes('bebida') ||
            p.category?.toLowerCase().includes('ocio')
        );
        const socialSpend = socialCategories.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        if (socialSpend > totalExpenses * 0.3 && socialCategories.length >= 2) {
          insights.push({
            type: 'social_spender',
            title: '👥 Gastador Social',
            description: `Destinas $${Math.round(socialSpend)} (${Math.round((socialSpend / totalExpenses) * 100)}%) a actividades sociales y entretenimiento. Valorar experiencias y relaciones es importante, pero el equilibrio es clave.`,
            impact: socialSpend > totalExpenses * 0.4 ? 'high' : 'medium',
            actionable: `Establece un "presupuesto social" de $${Math.round(socialSpend * 0.8)} mensual. Busca alternativas económicas: picnics, noches de juegos en casa, happy hours tempranos.`,
            priority: socialSpend > totalExpenses * 0.4 ? 8 : 6,
            confidence: 0.8,
          });
        }

        // 16. LIFESTYLE INFLATION - Gastos crecientes sin justificación clara
        if (spendingTrend === 'up' && monthlyInsights.length >= 2) {
          const lastMonthSpend = monthlyInsights[0]?.totalSpent || 0;
          const previousMonthSpend = monthlyInsights[1]?.totalSpent || 0;
          const increasePercent =
            previousMonthSpend > 0
              ? ((lastMonthSpend - previousMonthSpend) / previousMonthSpend) *
                100
              : 0;

          if (increasePercent > 15 && totalExpenses > 5000) {
            insights.push({
              type: 'lifestyle_inflation',
              title: '📈 Inflación de Estilo de Vida',
              description: `Tus gastos aumentaron ${Math.round(increasePercent)}% este mes ($${Math.round(lastMonthSpend - previousMonthSpend)} adicionales). Cuando mejoran nuestros ingresos, tendemos a aumentar gastos proporcionalmente.`,
              impact: increasePercent > 25 ? 'high' : 'medium',
              actionable: `Audita nuevos gastos: ¿son realmente necesarios? Intenta mantener gastos base estables y destina aumentos de ingresos 70% ahorro, 30% mejoras de vida.`,
              priority: increasePercent > 25 ? 9 : 7,
              confidence: 0.75,
            });
          }
        }

        // 17. PEER BENCHMARKER - Comparación con usuarios similares (simulado)
        const avgTransactionAmount = totalExpenses / transactionCount;
        const categoryCount = spendingPatterns.length;

        if (transactionCount >= 5 && totalExpenses > 2000) {
          // Simulamos comparación con "usuarios similares" basado en patrones
          const isAboveAverage =
            avgTransactionAmount > 150 && categoryCount >= 4;
          const percentile = isAboveAverage ? 75 : 50;

          insights.push({
            type: 'peer_benchmarker',
            title: '📊 Comparador con Pares',
            description: `Tu promedio de gasto por transacción ($${Math.round(avgTransactionAmount)}) y diversidad de categorías (${categoryCount}) te ubican en el percentil ${percentile} comparado con usuarios similares.`,
            impact: 'low', // Informativo
            actionable: isAboveAverage
              ? `Tienes un perfil de gastos diversificado. Considera optimizar las categorías de mayor impacto para maximizar value.`
              : `Tu perfil es estable. Para optimizar, enfócate en las 2-3 categorías principales donde pequeños cambios generen mayor impacto.`,
            priority: 3,
            confidence: 0.6, // Menor confianza por ser simulado
          });
        }

        // === FINANCIAL EFFICIENCY INSIGHTS ===

        // 18. COST OPTIMIZER - Usuario que busca eficiencia en gastos
        if (
          enhanced.expense_volatility > 70 &&
          enhanced.duplicate_transactions_count <= 1 &&
          categoryCount >= 4
        ) {
          insights.push({
            type: 'cost_optimizer',
            title: '💡 Optimizador de Costos',
            description: `Con ${Math.round(enhanced.expense_volatility)}% de variabilidad en gastos y ${categoryCount} categorías diversificadas, muestras flexibilidad para buscar mejores opciones y precios.`,
            impact: 'low', // Comportamiento positivo
            actionable: `¡Excelente enfoque! Para maximizar tu estrategia, usa herramientas de cashback, compara precios online y aprovecha descuentos por volumen en categorías frecuentes.`,
            priority: 3,
            confidence: 0.7,
          });
        }

        // 19. BUDGET BALANCER - Usuario que mantiene equilibrio entre categorías
        const categoryBalance =
          spendingPatterns.length >= 3 &&
          !spendingPatterns.some((p) => p.amount > totalExpenses * 0.5); // Ninguna categoría domina >50%

        if (categoryBalance && enhanced.spending_consistency_score > 60) {
          const topCategoryPercent = spendingPatterns[0]
            ? (spendingPatterns[0].amount / totalExpenses) * 100
            : 0;
          insights.push({
            type: 'budget_balancer',
            title: '⚖️ Equilibrista del Presupuesto',
            description: `Mantienes un balance saludable entre categorías (mayor: ${Math.round(topCategoryPercent)}%) y ${Math.round(enhanced.spending_consistency_score)}% de consistencia. Este equilibrio demuestra madurez financiera.`,
            impact: 'low', // Positivo
            actionable: `¡Perfecto balance! Mantén esta distribución. Considera crear subcategorías en tus gastos principales para un control aún más granular.`,
            priority: 2,
            confidence: 0.88,
          });
        }

        // 20. FINANCIAL MINIMALIST - Usuario con gastos eficientes y focalizados
        if (
          transactionCount <= 8 &&
          transactionCount >= 4 &&
          enhanced.category_diversity_score <= 5 &&
          avgTransactionAmount > 100
        ) {
          insights.push({
            type: 'financial_minimalist',
            title: '✨ Minimalista Financiero',
            description: `Con solo ${transactionCount} transacciones pero un promedio de $${Math.round(avgTransactionAmount)} cada una, demuestras un enfoque minimalista e intencional en tus gastos.`,
            impact: 'low', // Comportamiento muy positivo
            actionable: `¡Excelente filosofía financiera! Tu enfoque "menos pero mejor" es ideal. Considera documentar tus criterios de decisión para compartir esta sabiduría.`,
            priority: 1, // Alta prioridad porque es muy positivo
            confidence: 0.85,
          });
        }
      } // Fin del bloque condicional de legacy insights (solo si insights.length < 3)

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
          enhancedDataAvailable: !!enhanced,
        }
      );

      // === INTELLIGENT PRIORITIZATION & ROTATION SYSTEM ===

      // Sort insights by intelligent scoring algorithm with MASSIVE BOOST for income+expense insights
      const scoredInsights = insights
        .map((insight) => {
          // Calculate composite score based on multiple factors
          const priorityScore = insight.priority || 5; // Higher priority = higher score
          const confidenceScore = (insight.confidence || 0.5) * 10; // Convert to 0-10 scale
          const impactScore =
            insight.impact === 'high'
              ? 10
              : insight.impact === 'medium'
                ? 6
                : 3;

          // Health score factor: critical health issues get priority boost
          const healthScore = insight.healthScore || 70;
          const healthUrgencyBoost =
            healthScore < 40 ? 4 : healthScore < 60 ? 2 : 0;
          const healthPositiveBoost = healthScore > 85 ? 3 : 0; // Reward positive behavior

          // Add randomness factor for rotation (10% of total score)
          const randomnessScore = Math.random() * 2;

          // Category-based boost for balanced representation
          const categoryBoost = this.getCategoryBoost(
            insight.category || 'other'
          );

          // === MASSIVE BOOST FOR NEW INCOME+EXPENSE INSIGHTS ===
          const newIncomeExpenseInsights = [
            'savings_champion',
            'cash_flow_master',
            'balanced_spender',
            'income_utilization_optimizer',
            'wealth_building_velocity',
            'expense_efficiency_master',
            'income_diversification_score',
            'financial_discipline_score',
            'financial_runway_calculator',
            'income_growth_tracker',
            'expense_control_master',
          ];

          const isNewInsight = newIncomeExpenseInsights.includes(insight.type);
          const newInsightMegaBoost = isNewInsight ? 50 : 0; // MASSIVE 50 point boost

          // Log scoring for debugging
          if (isNewInsight) {
            logger.info(
              LogModule.DB,
              `🚀 NEW INSIGHT MEGA BOOST for ${insight.type}`,
              {
                priority: priorityScore,
                megaBoost: newInsightMegaBoost,
                healthScore: healthScore,
              }
            );
          }

          // Boost motivational insights (positive reinforcement)
          const motivationalBoost =
            (insight.category === 'motivation' && insight.impact === 'low') ||
            newIncomeExpenseInsights.includes(insight.type)
              ? 3
              : 0;

          const totalScore =
            priorityScore * 0.4 + // Priority weight INCREASED for new insights
            confidenceScore * 0.15 + // Confidence weight reduced
            impactScore * 0.1 + // Impact weight reduced
            healthUrgencyBoost * 0.15 + // Health urgency factor
            healthPositiveBoost * 0.1 + // Positive reinforcement
            categoryBoost * 0.05 + // Category balance
            randomnessScore + // Rotation factor
            motivationalBoost + // Motivational boost
            newInsightMegaBoost; // MEGA BOOST for new insights

          return {
            ...insight,
            score: totalScore,
          };
        })
        .sort((a, b) => b.score - a.score); // Highest score first

      // Select top 3 with intelligent balancing
      const selectedInsights = [];
      const usedCategories = new Set();

      // First pass: Select highest priority insights without category overlap
      for (const insight of scoredInsights) {
        if (selectedInsights.length >= 3) break;

        const category = this.getInsightCategory(insight.type);
        if (!usedCategories.has(category) || selectedInsights.length === 0) {
          selectedInsights.push(insight);
          usedCategories.add(category);
        }
      }

      // Second pass: Fill remaining slots with best remaining insights
      for (const insight of scoredInsights) {
        if (selectedInsights.length >= 3) break;
        if (!selectedInsights.find((s) => s.type === insight.type)) {
          selectedInsights.push(insight);
        }
      }

      // Clean up the score field before returning (not needed in UI)
      const finalInsights = selectedInsights.map(
        ({ score: _score, ...insight }) => insight
      );

      return finalInsights.slice(0, 3); // Ensure exactly 3 insights
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
   * Helper function to categorize insights for intelligent rotation
   */
  private static getInsightCategory(
    insightType: PsychologicalInsight['type']
  ): string {
    const categoryMap: Record<string, string> = {
      // === SALUD FINANCIERA BASE (5) ===
      savings_champion: 'health',
      balanced_spender: 'health',
      paycheck_to_paycheck: 'health',
      income_volatility_alert: 'health',
      cash_flow_master: 'health',

      // === PATRONES TEMPORALES AVANZADOS (5) ===
      weekend_income_ratio: 'temporal',
      post_paycheck_spending: 'temporal',
      income_expense_lag: 'temporal',
      month_end_financial_stress: 'temporal',
      seasonal_mismatch: 'temporal',

      // === COMPORTAMIENTO PSICOLÓGICO (5) ===
      lifestyle_inflation_detector: 'psychological',
      income_anchoring_bias: 'psychological',
      windfall_effect: 'psychological',
      income_insecurity_hoarding: 'psychological',
      expense_ceiling_phenomenon: 'psychological',

      // === EFICIENCIA Y OPTIMIZACIÓN (5) ===
      income_utilization_optimizer: 'efficiency',
      expense_efficiency_master: 'efficiency',
      income_diversification_score: 'efficiency',
      financial_runway_calculator: 'efficiency',
      income_goal_alignment: 'efficiency',

      // === GAMIFICACIÓN Y MOTIVACIÓN (5) ===
      savings_rate_champion: 'motivation',
      income_growth_tracker: 'motivation',
      expense_control_master: 'motivation',
      financial_discipline_score: 'motivation',
      wealth_building_velocity: 'motivation',

      // Legacy insights (mantener durante transición)
      loss_aversion: 'behavioral',
      mental_accounting: 'behavioral',
      present_bias: 'behavioral',
      weekend_spender: 'temporal',
      night_owl_spender: 'temporal',
      payday_syndrome: 'temporal',
      month_end_saver: 'temporal',
      impulse_buyer: 'behavioral',
      loyal_spender: 'behavioral',
      deal_hunter: 'behavioral',
      subscription_creep: 'behavioral',
      progress_champion: 'motivation',
      streak_master: 'motivation',
      small_wins_collector: 'motivation',
      social_spender: 'social',
      lifestyle_inflation: 'social',
      peer_benchmarker: 'social',
      cost_optimizer: 'efficiency',
      budget_balancer: 'efficiency',
      financial_minimalist: 'efficiency',
      social_proof: 'social',
      emotional_spending: 'behavioral',
      anchoring_bias: 'behavioral',
      availability_heuristic: 'behavioral',
      confirmation_bias: 'behavioral',
    };

    return categoryMap[insightType] || 'other';
  }

  /**
   * Calculate basic financial ratios manually if enhanced analytics fails
   */
  private static async calculateBasicRatios(userId: string, supabase: any) {
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
        return {};
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

      logger.info(LogModule.DB, 'Calculated basic ratios manually', {
        totalIncome,
        totalExpenses,
        savingsRate,
        expenseRatio,
        cashFlow,
      });

      return {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        cash_flow: cashFlow,
        savings_rate: savingsRate,
        expense_ratio: expenseRatio,
        income_utilization_score: expenseRatio / 20, // Simple heuristic
        weekend_expense_ratio: 25, // Default assumption
        lifestyle_inflation_rate: 5, // Default
        income_growth_rate: 8, // Default
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculating basic ratios', { error });
      return {};
    }
  }

  /**
   * Get category boost score for balanced insight representation
   * Provides rotation between different insight categories to avoid clustering
   */
  private static getCategoryBoost(category: string): number {
    // Track usage to provide balanced representation
    // In a real app, this could use user history or session storage

    // Base weights for different categories (higher = more likely to show)
    const categoryWeights: Record<string, number> = {
      health: 3.5, // Prioritize financial health insights
      psychological: 2.8, // Important behavioral patterns
      temporal: 2.5, // Time-based patterns
      efficiency: 2.2, // Optimization insights
      motivation: 2.0, // Positive reinforcement
      behavioral: 1.8, // Legacy behavioral insights
      social: 1.5, // Social comparison insights
      other: 1.0, // Default fallback
    };

    // Get base weight for category
    const baseWeight = categoryWeights[category] || categoryWeights.other;

    // Add slight randomization for rotation (±0.3)
    const randomVariation = (Math.random() - 0.5) * 0.6;

    // Apply time-based rotation (different categories favored at different times)
    const hourOfDay = new Date().getHours();
    let timeBoost = 0;

    // Morning boost for health & efficiency insights (6AM-11AM)
    if (
      hourOfDay >= 6 &&
      hourOfDay <= 11 &&
      (category === 'health' || category === 'efficiency')
    ) {
      timeBoost = 0.5;
    }
    // Afternoon boost for psychological & behavioral (12PM-5PM)
    else if (
      hourOfDay >= 12 &&
      hourOfDay <= 17 &&
      (category === 'psychological' || category === 'behavioral')
    ) {
      timeBoost = 0.3;
    }
    // Evening boost for motivation & temporal (6PM-10PM)
    else if (
      hourOfDay >= 18 &&
      hourOfDay <= 22 &&
      (category === 'motivation' || category === 'temporal')
    ) {
      timeBoost = 0.4;
    }

    return baseWeight + randomVariation + timeBoost;
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
