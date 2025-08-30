/**
 * 📊 ANALYTICS CONFIGURATION
 * Central configuration for all analytics-related constants
 * Removes hardcoding and enables easy customization
 */

// ==================== TIME PERIODS ====================
export const ANALYTICS_TIME_PERIODS = {
  // Default periods (in days/months)
  DEFAULT_SPENDING_PATTERNS_DAYS: 30,
  DEFAULT_MONTHLY_INSIGHTS_MONTHS: 6,
  DEFAULT_FORECAST_DAYS: 30,

  // Cache intervals (in milliseconds)
  DEFAULT_CACHE_INTERVAL: 5 * 60 * 1000, // 5 minutes
  BACKGROUND_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutes

  // User selectable options
  AVAILABLE_PATTERN_PERIODS: [7, 15, 30, 60, 90] as const,
  AVAILABLE_INSIGHT_PERIODS: [3, 6, 12, 24] as const,
  AVAILABLE_FORECAST_PERIODS: [7, 15, 30, 60] as const,
} as const;

// ==================== TRENDING THRESHOLDS ====================
export const TREND_ANALYSIS = {
  // Threshold percentages for trend detection
  UP_TREND_THRESHOLD: 1.1, // 10% increase
  DOWN_TREND_THRESHOLD: 0.9, // 10% decrease
  SIGNIFICANT_CHANGE_THRESHOLD: 1.2, // 20% for "significant" changes

  // Streak configuration
  MIN_STREAK_DAYS_FOR_POSITIVE: 7,
  EXCELLENT_STREAK_DAYS: 30,

  // Confidence levels for forecasting
  MIN_CONFIDENCE_THRESHOLD: 0.3,
  HIGH_CONFIDENCE_THRESHOLD: 0.7,
  EXCELLENT_CONFIDENCE_THRESHOLD: 0.85,
} as const;

// ==================== PSYCHOLOGICAL INSIGHTS ====================
export const PSYCHOLOGICAL_INSIGHTS_CONFIG = {
  // Impact level thresholds
  HIGH_IMPACT_THRESHOLD: 0.2, // 20% impact on budget
  MEDIUM_IMPACT_THRESHOLD: 0.1, // 10% impact on budget

  // Types and their default configurations
  INSIGHT_TYPES: {
    LOSS_AVERSION: {
      type: 'loss_aversion' as const,
      icon: 'warning-outline',
      colorKey: 'error',
      priority: 1,
    },
    MENTAL_ACCOUNTING: {
      type: 'mental_accounting' as const,
      icon: 'pie-chart-outline',
      colorKey: 'primary',
      priority: 2,
    },
    PRESENT_BIAS: {
      type: 'present_bias' as const,
      icon: 'trending-up-outline',
      colorKey: 'info',
      priority: 3,
    },
    SOCIAL_PROOF: {
      type: 'social_proof' as const,
      icon: 'trophy-outline',
      colorKey: 'success',
      priority: 4,
    },
  },

  // Maximum insights to show at once
  MAX_INSIGHTS_DISPLAY: 4,
  MAX_HIGH_IMPACT_INSIGHTS: 2,
} as const;

// ==================== UI CONFIGURATION ====================
export const UI_CONFIG = {
  // Dashboard tabs
  DASHBOARD_TABS: {
    INSIGHTS: {
      key: 'insights' as const,
      icon: '🧠',
      title: 'Insights',
    },
    PATTERNS: {
      key: 'patterns' as const,
      icon: '📈',
      title: 'Patrones',
    },
    FORECAST: {
      key: 'forecast' as const,
      icon: '🔮',
      title: 'Proyección',
    },
  },

  // Quick stats configuration
  QUICK_STATS: {
    TOTAL_SPENDING: {
      key: 'total_spending' as const,
      icon: 'wallet-outline',
      title: 'Gasto Total',
    },
    TOP_CATEGORY: {
      key: 'top_category' as const,
      icon: 'pie-chart-outline',
      title: 'Top Categoría',
    },
    CURRENT_STREAK: {
      key: 'current_streak' as const,
      icon: 'flame-outline',
      title: 'Racha Actual',
    },
  },

  // Animation and interaction
  REFRESH_ANIMATION_DURATION: 300,
  TAB_ANIMATION_DURATION: 200,
  CARD_PRESS_SCALE: 0.98,
} as const;

// ==================== DATA VALIDATION ====================
export const DATA_VALIDATION = {
  // Minimum data requirements
  MIN_TRANSACTIONS_FOR_INSIGHTS: 5,
  MIN_DAYS_OF_DATA: 7,
  MIN_CATEGORIES_FOR_PATTERNS: 2,

  // Maximum values for safety
  MAX_FORECAST_DAYS: 365,
  MAX_PATTERN_DAYS: 730, // 2 years
  MAX_INSIGHT_MONTHS: 48, // 4 years

  // Data quality thresholds
  MIN_DATA_QUALITY_SCORE: 0.6,
  REQUIRED_CONFIDENCE_FOR_DISPLAY: 0.4,
} as const;

// ==================== FEATURE FLAGS ====================
export const ANALYTICS_FEATURES = {
  // Feature toggles
  ENABLE_PSYCHOLOGICAL_INSIGHTS: true,
  ENABLE_SPENDING_FORECAST: true,
  ENABLE_SOCIAL_COMPARISONS: false, // Future feature
  ENABLE_EXPORT_FUNCTIONALITY: false, // Future feature
  ENABLE_CUSTOM_CATEGORIES: false, // Future feature

  // Experimental features
  EXPERIMENTAL_AI_INSIGHTS: false,
  EXPERIMENTAL_VOICE_INSIGHTS: false,

  // Development features
  SHOW_DEBUG_INFO: __DEV__,
  ENABLE_MOCK_DATA_FALLBACK: true,
  LOG_ANALYTICS_PERFORMANCE: __DEV__,
} as const;

// ==================== ENVIRONMENT-BASED CONFIG ====================
export const getEnvironmentConfig = () => {
  const isDev = __DEV__;
  const isProd = !__DEV__;

  return {
    // Cache intervals based on environment
    cacheInterval: isDev
      ? ANALYTICS_TIME_PERIODS.DEFAULT_CACHE_INTERVAL / 2 // Shorter cache in dev
      : ANALYTICS_TIME_PERIODS.DEFAULT_CACHE_INTERVAL,

    // Logging levels
    enableVerboseLogging: isDev,
    enablePerformanceMetrics: isDev,

    // Mock data usage
    preferRealData: isProd,
    fallbackToMockData: true,

    // API timeouts
    apiTimeout: isDev ? 10000 : 5000, // 10s dev, 5s prod
  };
};

// ==================== USER PREFERENCES DEFAULTS ====================
export const DEFAULT_USER_PREFERENCES = {
  // Time periods
  spendingPatternsDays: ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS,
  monthlyInsightsMonths: ANALYTICS_TIME_PERIODS.DEFAULT_MONTHLY_INSIGHTS_MONTHS,
  forecastDays: ANALYTICS_TIME_PERIODS.DEFAULT_FORECAST_DAYS,

  // UI preferences
  defaultTab: 'insights' as const,
  showQuickStats: true, // Always true - hidden from user
  enablePushNotifications: false,

  // Insight preferences
  maxInsightsPerType: 2,
  hideCompletedInsights: true, // Always true - hidden from user
  preferHighImpactInsights: true, // Always true - hidden from user

  // Language and localization
  preferredLanguage: 'es' as const,
  currency: 'UYU' as const,
  dateFormat: 'DD/MM/YYYY' as const,
} as const;

// ==================== EXPORT TYPES ====================
export type AnalyticsTimePeriodsType = typeof ANALYTICS_TIME_PERIODS;
export type TrendAnalysisType = typeof TREND_ANALYSIS;
export type PsychologicalInsightType =
  keyof typeof PSYCHOLOGICAL_INSIGHTS_CONFIG.INSIGHT_TYPES;
export type DashboardTabType = keyof typeof UI_CONFIG.DASHBOARD_TABS;
export type UserPreferencesType = typeof DEFAULT_USER_PREFERENCES;

// ==================== HELPER FUNCTIONS ====================
export const getInsightTypeConfig = (
  type: PsychologicalInsightType | string
) => {
  // Handle null/undefined
  if (!type) {
    console.warn('No insight type provided');
    return {
      type: 'unknown' as const,
      icon: 'information-circle-outline' as const,
      colorKey: 'primary' as const,
      priority: 5,
    };
  }

  // Convert to string and handle case
  const typeStr = String(type);
  const upperType = typeStr.toUpperCase();

  // Map lowercase to uppercase if needed
  const typeMap: Record<string, PsychologicalInsightType> = {
    loss_aversion: 'LOSS_AVERSION',
    mental_accounting: 'MENTAL_ACCOUNTING',
    present_bias: 'PRESENT_BIAS',
    social_proof: 'SOCIAL_PROOF',
    LOSS_AVERSION: 'LOSS_AVERSION',
    MENTAL_ACCOUNTING: 'MENTAL_ACCOUNTING',
    PRESENT_BIAS: 'PRESENT_BIAS',
    SOCIAL_PROOF: 'SOCIAL_PROOF',
  };

  const mappedType = typeMap[typeStr] || typeMap[upperType];

  if (!mappedType) {
    console.warn(`Unknown insight type: ${type}`);
    // Return a default config instead of null
    return {
      type: typeStr as const,
      icon: 'information-circle-outline' as const,
      colorKey: 'primary' as const,
      priority: 5,
    };
  }

  const config = PSYCHOLOGICAL_INSIGHTS_CONFIG.INSIGHT_TYPES[mappedType];

  // Ensure the config has all required fields
  return {
    ...config,
    colorKey: config.colorKey || 'primary',
    icon: config.icon || 'information-circle-outline',
  };
};

export const getDashboardTabConfig = (tab: DashboardTabType) => {
  return UI_CONFIG.DASHBOARD_TABS[tab];
};

export const isFeatureEnabled = (
  feature: keyof typeof ANALYTICS_FEATURES
): boolean => {
  return ANALYTICS_FEATURES[feature];
};

export const validateTimePeriod = (
  days: number,
  type: 'patterns' | 'forecast'
): number => {
  const maxDays =
    type === 'patterns'
      ? DATA_VALIDATION.MAX_PATTERN_DAYS
      : DATA_VALIDATION.MAX_FORECAST_DAYS;

  return Math.min(Math.max(days, 1), maxDays);
};

export const validateInsightMonths = (months: number): number => {
  return Math.min(Math.max(months, 1), DATA_VALIDATION.MAX_INSIGHT_MONTHS);
};
