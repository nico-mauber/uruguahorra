/**
 * 🌍 ENVIRONMENT CONFIGURATION
 * Centralized environment variable management for analytics
 * Provides type-safe access to environment variables with fallbacks
 */

import {
  ANALYTICS_TIME_PERIODS,
  TREND_ANALYSIS,
  DEFAULT_USER_PREFERENCES,
} from './analytics.config';

// Helper function to safely parse environment variables
const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvString = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

// ==================== ANALYTICS ENVIRONMENT CONFIG ====================
export const ENV_CONFIG = {
  // Feature toggles
  ANALYTICS_ENABLED: getEnvBoolean('EXPO_PUBLIC_ANALYTICS_ENABLED', true),
  PSYCHOLOGICAL_INSIGHTS_ENABLED: getEnvBoolean(
    'EXPO_PUBLIC_PSYCHOLOGICAL_INSIGHTS_ENABLED',
    true
  ),
  SPENDING_FORECAST_ENABLED: getEnvBoolean(
    'EXPO_PUBLIC_SPENDING_FORECAST_ENABLED',
    true
  ),

  // Performance settings
  CACHE_INTERVAL: getEnvNumber(
    'EXPO_PUBLIC_ANALYTICS_CACHE_INTERVAL',
    ANALYTICS_TIME_PERIODS.DEFAULT_CACHE_INTERVAL
  ),
  BACKGROUND_REFRESH_INTERVAL: getEnvNumber(
    'EXPO_PUBLIC_ANALYTICS_BACKGROUND_REFRESH',
    ANALYTICS_TIME_PERIODS.BACKGROUND_REFRESH_INTERVAL
  ),
  API_TIMEOUT: getEnvNumber('EXPO_PUBLIC_ANALYTICS_API_TIMEOUT', 5000),

  // Data validation
  MIN_TRANSACTIONS_FOR_INSIGHTS: getEnvNumber(
    'EXPO_PUBLIC_MIN_TRANSACTIONS_FOR_INSIGHTS',
    5
  ),
  MIN_DAYS_OF_DATA: getEnvNumber('EXPO_PUBLIC_MIN_DAYS_OF_DATA', 7),
  MAX_INSIGHTS_DISPLAY: getEnvNumber('EXPO_PUBLIC_MAX_INSIGHTS_DISPLAY', 4),

  // Development settings
  DEBUG_MODE: getEnvBoolean('EXPO_PUBLIC_ANALYTICS_DEBUG_MODE', __DEV__),
  // Data source preferences
  MOCK_FALLBACK: getEnvBoolean('EXPO_PUBLIC_ANALYTICS_MOCK_FALLBACK', true),
  PREFER_REAL_DATA: getEnvBoolean('EXPO_PUBLIC_PREFER_REAL_DATA', true),
  VERBOSE_LOGGING: getEnvBoolean(
    'EXPO_PUBLIC_ANALYTICS_VERBOSE_LOGGING',
    __DEV__
  ),

  // Trend analysis thresholds
  UP_TREND_THRESHOLD: getEnvNumber(
    'EXPO_PUBLIC_UP_TREND_THRESHOLD',
    TREND_ANALYSIS.UP_TREND_THRESHOLD
  ),
  DOWN_TREND_THRESHOLD: getEnvNumber(
    'EXPO_PUBLIC_DOWN_TREND_THRESHOLD',
    TREND_ANALYSIS.DOWN_TREND_THRESHOLD
  ),
  HIGH_IMPACT_THRESHOLD: getEnvNumber('EXPO_PUBLIC_HIGH_IMPACT_THRESHOLD', 0.2),

  // UI settings
  REFRESH_ANIMATION_DURATION: getEnvNumber(
    'EXPO_PUBLIC_REFRESH_ANIMATION_DURATION',
    300
  ),
  TAB_ANIMATION_DURATION: getEnvNumber(
    'EXPO_PUBLIC_TAB_ANIMATION_DURATION',
    200
  ),

  // Localization
  DEFAULT_LANGUAGE: getEnvString(
    'EXPO_PUBLIC_DEFAULT_LANGUAGE',
    DEFAULT_USER_PREFERENCES.preferredLanguage
  ),
  DEFAULT_CURRENCY: getEnvString(
    'EXPO_PUBLIC_DEFAULT_CURRENCY',
    DEFAULT_USER_PREFERENCES.currency
  ),
  DEFAULT_DATE_FORMAT: getEnvString(
    'EXPO_PUBLIC_DEFAULT_DATE_FORMAT',
    DEFAULT_USER_PREFERENCES.dateFormat
  ),

  // Feature flags
  ENABLE_CUSTOM_CATEGORIES: getEnvBoolean(
    'EXPO_PUBLIC_ENABLE_CUSTOM_CATEGORIES',
    false
  ),
  EXPERIMENTAL_AI_INSIGHTS: getEnvBoolean(
    'EXPO_PUBLIC_EXPERIMENTAL_AI_INSIGHTS',
    false
  ),
} as const;

// ==================== RUNTIME CONFIGURATION ====================
export const getRuntimeConfig = () => {
  const isDevelopment = __DEV__;
  const isProduction = !__DEV__;

  return {
    // Environment detection
    isDevelopment,
    isProduction,

    // Dynamic cache configuration
    cacheInterval: isDevelopment
      ? Math.min(ENV_CONFIG.CACHE_INTERVAL, 30000) // Max 30s in dev
      : ENV_CONFIG.CACHE_INTERVAL,

    // API configuration
    apiTimeout: isDevelopment
      ? Math.max(ENV_CONFIG.API_TIMEOUT, 10000) // Min 10s in dev
      : ENV_CONFIG.API_TIMEOUT,

    // Logging configuration
    enableLogging: isDevelopment || ENV_CONFIG.VERBOSE_LOGGING,
    logLevel: isDevelopment ? 'debug' : 'info',

    // Performance monitoring
    enablePerformanceMetrics: isDevelopment,
    enableMemoryMonitoring: isDevelopment && ENV_CONFIG.DEBUG_MODE,

    // Feature availability
    featuresEnabled: {
      analytics: ENV_CONFIG.ANALYTICS_ENABLED,
      psychologicalInsights:
        ENV_CONFIG.PSYCHOLOGICAL_INSIGHTS_ENABLED &&
        ENV_CONFIG.ANALYTICS_ENABLED,
      spendingForecast:
        ENV_CONFIG.SPENDING_FORECAST_ENABLED && ENV_CONFIG.ANALYTICS_ENABLED,
      customCategories: ENV_CONFIG.ENABLE_CUSTOM_CATEGORIES,
      aiInsights: ENV_CONFIG.EXPERIMENTAL_AI_INSIGHTS && isDevelopment,
    },
  };
};

// ==================== VALIDATION HELPERS ====================
export const validateEnvironmentConfig = (): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Validate cache intervals
  if (ENV_CONFIG.CACHE_INTERVAL < 1000) {
    errors.push('CACHE_INTERVAL must be at least 1000ms');
  }

  if (ENV_CONFIG.BACKGROUND_REFRESH_INTERVAL < ENV_CONFIG.CACHE_INTERVAL) {
    errors.push(
      'BACKGROUND_REFRESH_INTERVAL must be greater than CACHE_INTERVAL'
    );
  }

  // Validate thresholds
  if (ENV_CONFIG.UP_TREND_THRESHOLD <= 1.0) {
    errors.push('UP_TREND_THRESHOLD must be greater than 1.0');
  }

  if (ENV_CONFIG.DOWN_TREND_THRESHOLD >= 1.0) {
    errors.push('DOWN_TREND_THRESHOLD must be less than 1.0');
  }

  // Validate data requirements
  if (ENV_CONFIG.MIN_TRANSACTIONS_FOR_INSIGHTS < 1) {
    errors.push('MIN_TRANSACTIONS_FOR_INSIGHTS must be at least 1');
  }

  if (ENV_CONFIG.MIN_DAYS_OF_DATA < 1) {
    errors.push('MIN_DAYS_OF_DATA must be at least 1');
  }

  // Validate UI settings
  if (
    ENV_CONFIG.MAX_INSIGHTS_DISPLAY < 1 ||
    ENV_CONFIG.MAX_INSIGHTS_DISPLAY > 10
  ) {
    errors.push('MAX_INSIGHTS_DISPLAY must be between 1 and 10');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== EXPORT CONFIGURATION OBJECT ====================
export const RUNTIME_CONFIG = getRuntimeConfig();

// Validate configuration on module load (development only)
if (__DEV__) {
  const validation = validateEnvironmentConfig();
  if (!validation.isValid) {
    console.warn(
      '⚠️ Environment configuration issues found:',
      validation.errors
    );
  }
}

// ==================== TYPE EXPORTS ====================
export type RuntimeConfigType = ReturnType<typeof getRuntimeConfig>;
export type EnvironmentConfigType = typeof ENV_CONFIG;
