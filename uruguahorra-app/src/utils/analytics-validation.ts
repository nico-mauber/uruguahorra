/**
 * 🔧 ANALYTICS VALIDATION UTILITIES
 * Validation rules and helpers for analytics preferences
 */

import { DATA_VALIDATION } from '@/config/analytics.config';
import type { AnalyticsPreferences } from '@/services/analytics-preferences.service';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: keyof AnalyticsPreferences;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: keyof AnalyticsPreferences;
  message: string;
  code: string;
}

/**
 * Validates analytics preferences with detailed error reporting
 */
export const validateAnalyticsPreferences = (
  preferences: Partial<AnalyticsPreferences>
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Time period validations
  if (preferences.spending_patterns_days !== undefined) {
    const days = preferences.spending_patterns_days;
    if (days < 7 || days > DATA_VALIDATION.MAX_PATTERN_DAYS) {
      errors.push({
        field: 'spending_patterns_days',
        message: `Los días para patrones deben estar entre 7 y ${DATA_VALIDATION.MAX_PATTERN_DAYS}`,
        code: 'INVALID_RANGE',
      });
    } else if (days < 14) {
      warnings.push({
        field: 'spending_patterns_days',
        message: 'Menos de 14 días puede generar patrones poco precisos',
        code: 'LOW_PRECISION_WARNING',
      });
    }
  }

  if (preferences.monthly_insights_months !== undefined) {
    const months = preferences.monthly_insights_months;
    if (months < 1 || months > DATA_VALIDATION.MAX_INSIGHT_MONTHS) {
      errors.push({
        field: 'monthly_insights_months',
        message: `Los meses para insights deben estar entre 1 y ${DATA_VALIDATION.MAX_INSIGHT_MONTHS}`,
        code: 'INVALID_RANGE',
      });
    } else if (months < 3) {
      warnings.push({
        field: 'monthly_insights_months',
        message: 'Menos de 3 meses puede limitar la calidad de insights',
        code: 'LIMITED_DATA_WARNING',
      });
    }
  }

  if (preferences.forecast_days !== undefined) {
    const days = preferences.forecast_days;
    if (days < 7 || days > DATA_VALIDATION.MAX_FORECAST_DAYS) {
      errors.push({
        field: 'forecast_days',
        message: `Los días de pronóstico deben estar entre 7 y ${DATA_VALIDATION.MAX_FORECAST_DAYS}`,
        code: 'INVALID_RANGE',
      });
    } else if (days > 90) {
      warnings.push({
        field: 'forecast_days',
        message: 'Pronósticos a más de 90 días pueden ser menos precisos',
        code: 'ACCURACY_WARNING',
      });
    }
  }

  // UI preferences validations
  if (preferences.max_insights_per_type !== undefined) {
    const max = preferences.max_insights_per_type;
    if (max < 1 || max > 5) {
      errors.push({
        field: 'max_insights_per_type',
        message: 'El máximo de insights por tipo debe estar entre 1 y 5',
        code: 'INVALID_RANGE',
      });
    }
  }

  // Performance preferences validations
  if (preferences.cache_interval !== undefined) {
    const interval = preferences.cache_interval;
    if (interval < 30000 || interval > 1800000) {
      errors.push({
        field: 'cache_interval',
        message: 'El intervalo de cache debe estar entre 30 segundos y 30 minutos',
        code: 'INVALID_RANGE',
      });
    } else if (interval < 60000) {
      warnings.push({
        field: 'cache_interval',
        message: 'Un cache muy corto puede afectar el rendimiento',
        code: 'PERFORMANCE_WARNING',
      });
    }
  }

  // Cross-field validations
  if (preferences.spending_patterns_days && preferences.forecast_days) {
    if (preferences.forecast_days > preferences.spending_patterns_days * 3) {
      warnings.push({
        field: 'forecast_days',
        message: 'Pronósticos muy largos comparados con el período de análisis pueden ser imprecisos',
        code: 'CROSS_FIELD_WARNING',
      });
    }
  }

  // Feature compatibility validations
  if (preferences.enable_spending_forecast === false && preferences.default_tab === 'forecast') {
    errors.push({
      field: 'default_tab',
      message: 'No puedes tener "Proyección" como tab por defecto si los pronósticos están deshabilitados',
      code: 'FEATURE_CONFLICT',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Sanitizes preferences to ensure they're within valid ranges
 */
export const sanitizeAnalyticsPreferences = (
  preferences: Partial<AnalyticsPreferences>
): Partial<AnalyticsPreferences> => {
  const sanitized = { ...preferences };

  // Clamp time periods to valid ranges
  if (sanitized.spending_patterns_days !== undefined) {
    sanitized.spending_patterns_days = Math.min(
      Math.max(sanitized.spending_patterns_days, 7),
      DATA_VALIDATION.MAX_PATTERN_DAYS
    );
  }

  if (sanitized.monthly_insights_months !== undefined) {
    sanitized.monthly_insights_months = Math.min(
      Math.max(sanitized.monthly_insights_months, 1),
      DATA_VALIDATION.MAX_INSIGHT_MONTHS
    );
  }

  if (sanitized.forecast_days !== undefined) {
    sanitized.forecast_days = Math.min(
      Math.max(sanitized.forecast_days, 7),
      DATA_VALIDATION.MAX_FORECAST_DAYS
    );
  }

  if (sanitized.max_insights_per_type !== undefined) {
    sanitized.max_insights_per_type = Math.min(
      Math.max(sanitized.max_insights_per_type, 1),
      5
    );
  }

  if (sanitized.cache_interval !== undefined) {
    sanitized.cache_interval = Math.min(
      Math.max(sanitized.cache_interval, 30000),
      1800000
    );
  }

  // Fix feature conflicts
  if (sanitized.enable_spending_forecast === false && sanitized.default_tab === 'forecast') {
    sanitized.default_tab = 'insights';
  }

  return sanitized;
};

/**
 * Generates user-friendly validation messages
 */
export const formatValidationMessage = (
  errors: ValidationError[],
  warnings: ValidationWarning[]
): string => {
  let message = '';

  if (errors.length > 0) {
    message += '❌ Errores encontrados:\n';
    errors.forEach((error, index) => {
      message += `${index + 1}. ${error.message}\n`;
    });
  }

  if (warnings.length > 0) {
    if (message) message += '\n';
    message += '⚠️ Advertencias:\n';
    warnings.forEach((warning, index) => {
      message += `${index + 1}. ${warning.message}\n`;
    });
  }

  return message.trim();
};

/**
 * Checks if preferences would result in good analytics quality
 */
export const assessAnalyticsQuality = (
  preferences: Partial<AnalyticsPreferences>
): {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  recommendations: string[];
} => {
  let score = 100;
  const recommendations: string[] = [];

  // Evaluate time periods
  if (preferences.spending_patterns_days) {
    if (preferences.spending_patterns_days < 14) {
      score -= 20;
      recommendations.push('Aumenta los días de análisis de patrones a al menos 14 para mejor precisión');
    } else if (preferences.spending_patterns_days < 30) {
      score -= 10;
      recommendations.push('Considera usar 30+ días para patrones más estables');
    }
  }

  if (preferences.monthly_insights_months) {
    if (preferences.monthly_insights_months < 3) {
      score -= 15;
      recommendations.push('Usa al menos 3 meses de datos para insights más relevantes');
    } else if (preferences.monthly_insights_months >= 12) {
      score += 5; // Bonus for long-term analysis
    }
  }

  // Evaluate features enabled
  if (preferences.enable_psychological_insights === false) {
    score -= 25;
    recommendations.push('Los insights psicológicos proporcionan análisis valiosos del comportamiento');
  }

  if (preferences.enable_spending_forecast === false) {
    score -= 15;
    recommendations.push('Los pronósticos te ayudan a planificar mejor tus gastos futuros');
  }

  // Evaluate UI preferences
  if (preferences.max_insights_per_type && preferences.max_insights_per_type < 2) {
    score -= 5;
    recommendations.push('Mostrar más insights por tipo te dará más información útil');
  }

  // Evaluate performance settings
  if (preferences.cache_interval && preferences.cache_interval < 120000) { // 2 minutes
    score -= 5;
    recommendations.push('Un cache muy corto puede afectar la velocidad de la app');
  }

  // Determine quality level
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 90) quality = 'excellent';
  else if (score >= 75) quality = 'good';
  else if (score >= 60) quality = 'fair';
  else quality = 'poor';

  return { quality, score, recommendations };
};

/**
 * Get quality indicator emoji and text
 */
export const getQualityIndicator = (quality: 'excellent' | 'good' | 'fair' | 'poor'): {
  emoji: string;
  text: string;
  color: string;
} => {
  switch (quality) {
    case 'excellent':
      return { emoji: '🟢', text: 'Excelente', color: '#22C55E' };
    case 'good':
      return { emoji: '🟡', text: 'Buena', color: '#EAB308' };
    case 'fair':
      return { emoji: '🟠', text: 'Regular', color: '#F97316' };
    case 'poor':
      return { emoji: '🔴', text: 'Mejorable', color: '#EF4444' };
  }
};