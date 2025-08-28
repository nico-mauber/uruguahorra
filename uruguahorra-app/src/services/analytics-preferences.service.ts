/**
 * 🎛️ ANALYTICS PREFERENCES SERVICE
 * Manages user-specific analytics configuration and preferences
 * Provides interface to database preferences with local fallbacks
 */

import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { DEFAULT_USER_PREFERENCES } from '@/config/analytics.config';
import { ENV_CONFIG } from '@/config/env.config';

// ==================== TYPES ====================
export interface AnalyticsPreferences {
  id?: string;
  user_id: string;

  // Time period preferences
  spending_patterns_days: number;
  monthly_insights_months: number;
  forecast_days: number;

  // UI preferences
  default_tab: 'insights' | 'patterns' | 'forecast';
  show_quick_stats: boolean;
  max_insights_per_type: number;
  hide_completed_insights: boolean;
  prefer_high_impact_insights: boolean;

  // Feature preferences
  enable_psychological_insights: boolean;
  enable_spending_forecast: boolean;
  enable_push_notifications: boolean;

  // Localization preferences
  preferred_language: 'es' | 'en';
  currency: 'UYU' | 'USD' | 'EUR';
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

  // Performance preferences
  cache_interval: number;
  auto_refresh: boolean;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface AnalyticsPreferencesUpdate {
  spending_patterns_days?: number;
  monthly_insights_months?: number;
  forecast_days?: number;
  default_tab?: 'insights' | 'patterns' | 'forecast';
  show_quick_stats?: boolean;
  max_insights_per_type?: number;
  hide_completed_insights?: boolean;
  prefer_high_impact_insights?: boolean;
  enable_psychological_insights?: boolean;
  enable_spending_forecast?: boolean;
  enable_push_notifications?: boolean;
  preferred_language?: 'es' | 'en';
  currency?: 'UYU' | 'USD' | 'EUR';
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  cache_interval?: number;
  auto_refresh?: boolean;
}

// ==================== ANALYTICS PREFERENCES SERVICE ====================
export class AnalyticsPreferencesService {
  /**
   * Get user analytics preferences with automatic fallback to defaults
   */
  static async getUserPreferences(
    userId: string
  ): Promise<AnalyticsPreferences> {
    try {
      logger.start(LogModule.DB, 'Getting analytics preferences', { userId });

      // Try to get preferences from database
      const { data, error } = await supabase.rpc(
        'get_or_create_analytics_preferences',
        {
          p_user_id: userId,
        }
      );

      if (!error && data) {
        logger.success(
          LogModule.DB,
          'Analytics preferences retrieved from database'
        );
        return this.transformDatabasePreferences(data);
      }

      // Fallback to defaults if database call fails
      logger.warn(LogModule.DB, 'Using default analytics preferences', {
        reason: error?.message || 'Database function not available',
      });

      return this.getDefaultPreferences(userId);
    } catch (error) {
      logger.error(LogModule.DB, 'Error getting analytics preferences', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Update user analytics preferences
   */
  static async updateUserPreferences(
    userId: string,
    updates: AnalyticsPreferencesUpdate
  ): Promise<AnalyticsPreferences> {
    try {
      logger.start(LogModule.DB, 'Updating analytics preferences', {
        userId,
        updates,
      });

      // Validate updates
      const validatedUpdates = this.validatePreferencesUpdate(updates);

      if (Object.keys(validatedUpdates).length === 0) {
        logger.info(LogModule.DB, 'No valid updates provided');
        return await this.getUserPreferences(userId);
      }

      // Update preferences in database
      const { data, error } = await supabase.rpc(
        'update_analytics_preferences',
        {
          p_user_id: userId,
          p_spending_patterns_days: validatedUpdates.spending_patterns_days,
          p_monthly_insights_months: validatedUpdates.monthly_insights_months,
          p_forecast_days: validatedUpdates.forecast_days,
          p_default_tab: validatedUpdates.default_tab,
          p_show_quick_stats: validatedUpdates.show_quick_stats,
          p_max_insights_per_type: validatedUpdates.max_insights_per_type,
          p_hide_completed_insights: validatedUpdates.hide_completed_insights,
          p_prefer_high_impact_insights:
            validatedUpdates.prefer_high_impact_insights,
          p_enable_psychological_insights:
            validatedUpdates.enable_psychological_insights,
          p_enable_spending_forecast: validatedUpdates.enable_spending_forecast,
          p_enable_push_notifications:
            validatedUpdates.enable_push_notifications,
          p_preferred_language: validatedUpdates.preferred_language,
          p_currency: validatedUpdates.currency,
          p_date_format: validatedUpdates.date_format,
          p_cache_interval: validatedUpdates.cache_interval,
          p_auto_refresh: validatedUpdates.auto_refresh,
        }
      );

      if (!error && data) {
        logger.success(
          LogModule.DB,
          'Analytics preferences updated successfully'
        );
        return this.transformDatabasePreferences(data);
      }

      throw new Error(error?.message || 'Failed to update preferences');
    } catch (error) {
      logger.error(LogModule.DB, 'Error updating analytics preferences', error);
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   */
  static async resetUserPreferences(
    userId: string
  ): Promise<AnalyticsPreferences> {
    try {
      logger.start(LogModule.DB, 'Resetting analytics preferences', { userId });

      const { data, error } = await supabase.rpc(
        'reset_analytics_preferences',
        {
          p_user_id: userId,
        }
      );

      if (!error && data) {
        logger.success(
          LogModule.DB,
          'Analytics preferences reset successfully'
        );
        return this.transformDatabasePreferences(data);
      }

      throw new Error(error?.message || 'Failed to reset preferences');
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error resetting analytics preferences',
        error
      );
      throw error;
    }
  }

  /**
   * Get preferences merged with environment config
   */
  static async getEffectivePreferences(
    userId: string
  ): Promise<AnalyticsPreferences> {
    const userPreferences = await this.getUserPreferences(userId);

    // Merge with environment overrides
    return {
      ...userPreferences,
      // Environment can override certain preferences
      cache_interval: Math.max(
        userPreferences.cache_interval,
        ENV_CONFIG.CACHE_INTERVAL
      ),
      enable_psychological_insights:
        userPreferences.enable_psychological_insights &&
        ENV_CONFIG.PSYCHOLOGICAL_INSIGHTS_ENABLED,
      enable_spending_forecast:
        userPreferences.enable_spending_forecast &&
        ENV_CONFIG.SPENDING_FORECAST_ENABLED,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get default preferences for a user
   */
  private static getDefaultPreferences(userId: string): AnalyticsPreferences {
    return {
      user_id: userId,
      ...DEFAULT_USER_PREFERENCES,
      // Override with environment config
      cache_interval: ENV_CONFIG.CACHE_INTERVAL,
      enable_psychological_insights: ENV_CONFIG.PSYCHOLOGICAL_INSIGHTS_ENABLED,
      enable_spending_forecast: ENV_CONFIG.SPENDING_FORECAST_ENABLED,
      preferred_language: ENV_CONFIG.DEFAULT_LANGUAGE as 'es' | 'en',
      currency: ENV_CONFIG.DEFAULT_CURRENCY as 'UYU' | 'USD' | 'EUR',
    };
  }

  /**
   * Transform database preferences to our interface
   */
  private static transformDatabasePreferences(
    dbData: any
  ): AnalyticsPreferences {
    return {
      id: dbData.id,
      user_id: dbData.user_id,
      spending_patterns_days: dbData.spending_patterns_days,
      monthly_insights_months: dbData.monthly_insights_months,
      forecast_days: dbData.forecast_days,
      default_tab: dbData.default_tab,
      show_quick_stats: dbData.show_quick_stats,
      max_insights_per_type: dbData.max_insights_per_type,
      hide_completed_insights: dbData.hide_completed_insights,
      prefer_high_impact_insights: dbData.prefer_high_impact_insights,
      enable_psychological_insights: dbData.enable_psychological_insights,
      enable_spending_forecast: dbData.enable_spending_forecast,
      enable_push_notifications: dbData.enable_push_notifications,
      preferred_language: dbData.preferred_language,
      currency: dbData.currency,
      date_format: dbData.date_format,
      cache_interval: dbData.cache_interval,
      auto_refresh: dbData.auto_refresh,
      created_at: dbData.created_at,
      updated_at: dbData.updated_at,
    };
  }

  /**
   * Validate and clean preferences update
   */
  private static validatePreferencesUpdate(
    updates: AnalyticsPreferencesUpdate
  ): AnalyticsPreferencesUpdate {
    const validated: AnalyticsPreferencesUpdate = {};

    // Validate time periods
    if (updates.spending_patterns_days !== undefined) {
      validated.spending_patterns_days = Math.min(
        Math.max(updates.spending_patterns_days, 7),
        365
      );
    }
    if (updates.monthly_insights_months !== undefined) {
      validated.monthly_insights_months = Math.min(
        Math.max(updates.monthly_insights_months, 1),
        48
      );
    }
    if (updates.forecast_days !== undefined) {
      validated.forecast_days = Math.min(
        Math.max(updates.forecast_days, 7),
        365
      );
    }

    // Validate UI preferences
    if (
      updates.default_tab !== undefined &&
      ['insights', 'patterns', 'forecast'].includes(updates.default_tab)
    ) {
      validated.default_tab = updates.default_tab;
    }
    if (updates.show_quick_stats !== undefined) {
      validated.show_quick_stats = Boolean(updates.show_quick_stats);
    }
    if (updates.max_insights_per_type !== undefined) {
      validated.max_insights_per_type = Math.min(
        Math.max(updates.max_insights_per_type, 1),
        5
      );
    }

    // Validate boolean preferences
    const booleanFields: (keyof AnalyticsPreferencesUpdate)[] = [
      'hide_completed_insights',
      'prefer_high_impact_insights',
      'enable_psychological_insights',
      'enable_spending_forecast',
      'enable_push_notifications',
      'auto_refresh',
    ];

    booleanFields.forEach((field) => {
      if (updates[field] !== undefined) {
        validated[field] = Boolean(updates[field]) as any;
      }
    });

    // Validate localization
    if (
      updates.preferred_language !== undefined &&
      ['es', 'en'].includes(updates.preferred_language)
    ) {
      validated.preferred_language = updates.preferred_language;
    }
    if (
      updates.currency !== undefined &&
      ['UYU', 'USD', 'EUR'].includes(updates.currency)
    ) {
      validated.currency = updates.currency;
    }
    if (
      updates.date_format !== undefined &&
      ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(updates.date_format)
    ) {
      validated.date_format = updates.date_format;
    }

    // Validate cache interval
    if (updates.cache_interval !== undefined) {
      validated.cache_interval = Math.min(
        Math.max(updates.cache_interval, 30000),
        1800000
      ); // 30s to 30min
    }

    return validated;
  }

  /**
   * Check if preferences are using defaults
   */
  static areDefaultPreferences(preferences: AnalyticsPreferences): boolean {
    const defaults = DEFAULT_USER_PREFERENCES;

    return (
      preferences.spending_patterns_days === defaults.spendingPatternsDays &&
      preferences.monthly_insights_months === defaults.monthlyInsightsMonths &&
      preferences.forecast_days === defaults.forecastDays &&
      preferences.default_tab === defaults.defaultTab &&
      preferences.preferred_language === defaults.preferredLanguage &&
      preferences.currency === defaults.currency
    );
  }

}

// ==================== EXPORT HELPERS ====================
export const getAnalyticsPreferences =
  AnalyticsPreferencesService.getUserPreferences;
export const updateAnalyticsPreferences =
  AnalyticsPreferencesService.updateUserPreferences;
export const resetAnalyticsPreferences =
  AnalyticsPreferencesService.resetUserPreferences;
export const getEffectiveAnalyticsPreferences =
  AnalyticsPreferencesService.getEffectivePreferences;
