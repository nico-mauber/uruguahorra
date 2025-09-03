export interface SpendingPattern {
  category: string;
  amount: number;
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  averageAmount: number;
}

export interface MonthlyInsight {
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

export interface SpendingForecast {
  predicted_amount: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  based_on_days: number;
}

export interface BasicRatios {
  total_income: number;
  total_expenses: number;
  cash_flow: number;
  savings_rate: number;
  expense_ratio: number;
  income_utilization_score: number;
  weekend_expense_ratio: number;
  lifestyle_inflation_rate: number;
  income_growth_rate: number;
}

export type PsychologicalInsightType =
  // SALUD FINANCIERA BASE (5)
  | 'savings_champion'
  | 'balanced_spender'
  | 'paycheck_to_paycheck'
  | 'income_volatility_alert'
  | 'cash_flow_master'

  // PATRONES TEMPORALES AVANZADOS (5)
  | 'weekend_income_ratio'
  | 'post_paycheck_spending'
  | 'income_expense_lag'
  | 'month_end_financial_stress'
  | 'seasonal_mismatch'

  // COMPORTAMIENTO PSICOLÓGICO (5)
  | 'lifestyle_inflation_detector'
  | 'income_anchoring_bias'
  | 'windfall_effect'
  | 'income_insecurity_hoarding'
  | 'expense_ceiling_phenomenon'

  // EFICIENCIA Y OPTIMIZACIÓN (5)
  | 'income_utilization_optimizer'
  | 'expense_efficiency_master'
  | 'income_diversification_score'
  | 'financial_runway_calculator'
  | 'income_goal_alignment'

  // GAMIFICACIÓN Y MOTIVACIÓN (5)
  | 'savings_rate_champion'
  | 'income_growth_tracker'
  | 'expense_control_master'
  | 'financial_discipline_score'
  | 'wealth_building_velocity'

  // Legacy types (mantener compatibilidad)
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

export interface PsychologicalInsight {
  type: PsychologicalInsightType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: string;
  priority?: number;
  confidence?: number;
  healthScore?: number;
  category?:
    | 'health'
    | 'temporal'
    | 'psychological'
    | 'efficiency'
    | 'motivation';
}

export interface AnalyticsMetadata {
  fetchedAt: string;
  dataSources: {
    patterns: 'available' | 'empty';
    insights: 'available' | 'empty';
    psychological: 'available' | 'empty';
    forecast: 'available' | 'disabled';
  };
  performance: {
    cacheInterval: number;
    apiTimeout: number;
    processingTime: number;
  };
}

export interface CompleteAnalytics {
  spendingPatterns: SpendingPattern[];
  monthlyInsights: MonthlyInsight[];
  psychologicalInsights: PsychologicalInsight[];
  forecast: SpendingForecast | null;
  metadata: AnalyticsMetadata;
}

export interface UserDataValidation {
  hasData: boolean;
  dataQuality: number;
  missingDataTypes: string[];
}
