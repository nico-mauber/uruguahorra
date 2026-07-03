/**
 * Tipos de la feature de Análisis (Analytics).
 * Fuente: docs/api/contracts-and-data-mapping.md §2.11/§3,
 * docs/features/analytics/analytics-functional-specs.md.
 *
 * Convención: las filas/tablas de los RPC se conservan en snake_case tal como
 * las devuelve PostgREST; los tipos derivados en cliente (insights, forecast)
 * usan la forma que consume la UI.
 */

/** Fila de `get_spending_patterns_for_period` (top 10). §3. */
export interface SpendingPattern {
  category: string;
  amount: number;
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  average_amount: number;
}

/** Categoría dentro de `top_categories` (jsonb) de un insight mensual. */
export interface MonthlyTopCategory {
  category: string;
  amount: number;
  percentage: number;
}

/** Fila de `get_monthly_spending_insights`. §3. */
export interface MonthlyInsight {
  /** Formato 'Mon YYYY'. */
  month: string;
  total_spent: number;
  budget_variance: number;
  top_categories: MonthlyTopCategory[];
  savings_rate: number;
  streak_days: number;
}

/** Fila única de `get_user_transaction_summary`. §3. */
export interface TransactionSummary {
  total_expenses: number;
  total_income: number;
  transaction_count: number;
  avg_daily_expense: number;
  top_category: string | null;
  spending_trend: 'up' | 'down' | 'stable';
  days_with_data: number;
}

/**
 * Fila única de `get_enhanced_user_analytics` (29 métricas). §3.
 * Se modelan explícitamente las métricas que consume el motor de insights;
 * el resto quedan accesibles vía la firma de índice permisiva.
 */
export interface EnhancedAnalytics {
  total_income: number;
  total_expenses: number;
  cash_flow: number;
  savings_rate: number;
  expense_ratio: number;
  /** Métricas adicionales derivadas (scores, ratios temporales, etc.). */
  [key: string]: number | string | boolean | null | undefined;
}

/**
 * Preferencias de analytics por usuario (fila de `user_analytics_preferences`).
 * Se conserva la forma snake_case de la BD (§2.11) para evitar mapeos y reflejar
 * los defaults directamente.
 */
export interface AnalyticsPreferences {
  id?: string;
  user_id: string;

  // Períodos
  spending_patterns_days: number;
  monthly_insights_months: number;
  forecast_days: number;

  // UI
  default_tab: 'insights' | 'patterns' | 'forecast';
  show_quick_stats: boolean;
  max_insights_per_type: number;
  hide_completed_insights: boolean;
  prefer_high_impact_insights: boolean;

  // Features
  enable_psychological_insights: boolean;
  enable_spending_forecast: boolean;
  enable_push_notifications: boolean;
  enable_export_functionality: boolean;

  // Localización
  preferred_language: 'es' | 'en';
  currency: 'UYU' | 'USD' | 'EUR';
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

  // Rendimiento
  cache_interval: number;
  auto_refresh: boolean;

  created_at?: string;
  updated_at?: string;
}

/** Patch parcial de preferencias (sólo los campos tocados). */
export type AnalyticsPreferencesPatch = Partial<
  Omit<AnalyticsPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/** Insight psicológico ya generado y listo para la UI. */
export interface PsychologicalInsight {
  /** Identificador estable del insight (deriva del `type` del config). */
  id: string;
  title: string;
  description: string;
  actionable: string;
  impact: 'low' | 'medium' | 'high';
  type: string;
  category: 'health' | 'efficiency' | 'psychological' | 'temporal' | 'motivation';
  /** Emoji/icono representativo. */
  icon: string;
}

/** Proyección de gasto. */
export interface Forecast {
  predicted_amount: number;
  /** 0-1. */
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Datos normalizados que alimentan al motor de insights.
 * Deriva de summary + enhanced + monthlyInsights + patterns.
 */
export interface InsightAnalysisData {
  expense_ratio: number;
  savings_rate: number;
  cash_flow: number;
  total_expenses: number;
  transactionCount: number;
  topCategory: string;
  spendingTrend: 'up' | 'down' | 'stable';
  /** Serie mensual reducida a lo que consumen las condiciones. */
  monthlyInsights: Array<{ total_spent: number; savings_rate: number }>;
}
