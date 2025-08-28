/**
 * 🎛️ ANALYTICS PREFERENCES HOOK
 * React hook for managing user analytics preferences
 * Provides state management and synchronization with database
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import {
  AnalyticsPreferencesService,
  type AnalyticsPreferences,
  type AnalyticsPreferencesUpdate,
} from '@/services/analytics-preferences.service';
import { logger, LogModule } from '@/utils/logger';
import { DEFAULT_USER_PREFERENCES } from '@/config/analytics.config';
import { preferencesCache, warmCache } from '@/utils/preferences-cache';

interface PreferencesState {
  preferences: AnalyticsPreferences | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
  isCached: boolean;
  cacheStats?: {
    hitRatio: number;
    totalRequests: number;
  };
}

const initialState: PreferencesState = {
  preferences: null,
  isLoading: false,
  error: null,
  lastSaved: null,
  isCached: false,
};

/**
 * Hook for managing analytics preferences
 * Provides local state with database synchronization
 */
export const useAnalyticsPreferences = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PreferencesState>(initialState);
  const loadingRef = useRef<boolean>(false);

  // ==================== CACHE AWARE FETCH PREFERENCES ====================
  const loadPreferences = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id || loadingRef.current) return;

    loadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      logger.start(LogModule.DB, 'Loading analytics preferences', {
        userId: user.id,
        forceRefresh,
      });

      let preferences: AnalyticsPreferences | null = null;
      let fromCache = false;

      // Try cache first unless force refresh
      if (!forceRefresh) {
        preferences = await preferencesCache.get(user.id);
        fromCache = !!preferences;
      }

      // If no cache hit or force refresh, fetch from database
      if (!preferences) {
        preferences = await AnalyticsPreferencesService.getEffectivePreferences(user.id);
        
        // Cache the fresh data
        if (preferences) {
          await preferencesCache.set(user.id, preferences);
        }
      }

      // Get cache stats for debugging
      const cacheStats = await preferencesCache.getStats();

      setState({
        preferences,
        isLoading: false,
        error: null,
              lastSaved: new Date(),
        isCached: fromCache,
        cacheStats: {
          hitRatio: cacheStats.hitRatio,
          totalRequests: cacheStats.totalRequests,
        },
      });

      logger.success(LogModule.DB, 'Analytics preferences loaded successfully', {
        fromCache,
        hitRatio: cacheStats.hitRatio,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error loading analytics preferences', error);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        isCached: false,
        // Fallback to defaults
        preferences: prev.preferences || {
          user_id: user.id,
          ...DEFAULT_USER_PREFERENCES,
        },
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [user?.id]);

  // ==================== CACHE-AWARE UPDATE PREFERENCES ====================
  const updatePreferences = useCallback(
    async (updates: AnalyticsPreferencesUpdate) => {
      if (!user?.id || !state.preferences) return false;

      try {
        logger.start(LogModule.DB, 'Updating analytics preferences', {
          userId: user.id,
          updates,
        });

        // Optimistically update local state
        const optimisticPreferences = { ...state.preferences, ...updates };
        setState((prev) => ({
          ...prev,
          preferences: optimisticPreferences,
          isCached: false, // Mark as not cached since we're updating
        }));

        // Update in database
        const updatedPreferences =
          await AnalyticsPreferencesService.updateUserPreferences(
            user.id,
            updates
          );

        // Update cache with fresh data
        await preferencesCache.set(user.id, updatedPreferences);

        setState((prev) => ({
          ...prev,
          preferences: updatedPreferences,
                  lastSaved: new Date(),
          error: null,
          isCached: true, // Now it's cached
        }));

        logger.success(
          LogModule.DB,
          'Analytics preferences updated successfully'
        );
        return true;
      } catch (error) {
        logger.error(
          LogModule.DB,
          'Error updating analytics preferences',
          error
        );

        // Invalidate cache on error
        await preferencesCache.invalidate(user.id);

        // Revert optimistic update on error
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Error al actualizar preferencias',
                  isCached: false,
        }));

        // Reload to get correct state
        await loadPreferences(true); // Force refresh
        return false;
      }
    },
    [user?.id, state.preferences, loadPreferences]
  );

  // ==================== CACHE-AWARE RESET PREFERENCES ====================
  const resetPreferences = useCallback(async () => {
    if (!user?.id) return false;

    try {
      logger.start(LogModule.DB, 'Resetting analytics preferences', {
        userId: user.id,
      });

      const defaultPreferences =
        await AnalyticsPreferencesService.resetUserPreferences(user.id);

      // Update cache with reset preferences
      await preferencesCache.set(user.id, defaultPreferences);

      setState({
        preferences: defaultPreferences,
        isLoading: false,
        error: null,
              lastSaved: new Date(),
        isCached: true,
      });

      logger.success(LogModule.DB, 'Analytics preferences reset successfully');
      return true;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error resetting analytics preferences',
        error
      );

      // Invalidate cache on error
      await preferencesCache.invalidate(user.id);

      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Error al resetear preferencias',
        isCached: false,
      }));

      return false;
    }
  }, [user?.id]);

  // ==================== AUTO-SAVE UPDATE HELPERS ====================
  const updateTimePreferences = useCallback(
    async (updates: {
      spendingPatternsDays?: number;
      monthlyInsightsMonths?: number;
      forecastDays?: number;
    }) => {
      // Auto-save immediately
      const result = await updatePreferences({
        spending_patterns_days: updates.spendingPatternsDays,
        monthly_insights_months: updates.monthlyInsightsMonths,
        forecast_days: updates.forecastDays,
      });
      return result;
    },
    [updatePreferences]
  );

  const updateUIPreferences = useCallback(
    async (updates: {
      defaultTab?: 'insights' | 'patterns' | 'forecast';
      showQuickStats?: boolean;
      maxInsightsPerType?: number;
      hideCompletedInsights?: boolean;
      preferHighImpactInsights?: boolean;
    }) => {
      // Auto-save immediately
      const result = await updatePreferences({
        default_tab: updates.defaultTab,
        show_quick_stats: updates.showQuickStats,
        max_insights_per_type: updates.maxInsightsPerType,
        hide_completed_insights: updates.hideCompletedInsights,
        prefer_high_impact_insights: updates.preferHighImpactInsights,
      });
      return result;
    },
    [updatePreferences]
  );

  const updateFeaturePreferences = useCallback(
    async (updates: {
      enablePsychologicalInsights?: boolean;
      enableSpendingForecast?: boolean;
      enablePushNotifications?: boolean;
    }) => {
      // Auto-save immediately
      const result = await updatePreferences({
        enable_psychological_insights: updates.enablePsychologicalInsights,
        enable_spending_forecast: updates.enableSpendingForecast,
        enable_push_notifications: updates.enablePushNotifications,
      });
      return result;
    },
    [updatePreferences]
  );

  const updateLocalizationPreferences = useCallback(
    async (updates: {
      preferredLanguage?: 'es' | 'en';
      currency?: 'UYU' | 'USD' | 'EUR';
      dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    }) => {
      // Auto-save immediately
      const result = await updatePreferences({
        preferred_language: updates.preferredLanguage,
        currency: updates.currency,
        date_format: updates.dateFormat,
      });
      return result;
    },
    [updatePreferences]
  );


  // ==================== CACHE MANAGEMENT ====================
  const clearCache = useCallback(async () => {
    if (user?.id) {
      await preferencesCache.invalidate(user.id);
      setState((prev) => ({ ...prev, isCached: false }));
    }
  }, [user?.id]);

  const refreshPreferences = useCallback(async () => {
    await loadPreferences(true);
  }, [loadPreferences]);

  const getCacheStats = useCallback(async () => {
    return await preferencesCache.getStats();
  }, []);

  // Warm cache on mount for better performance
  const warmUpCache = useCallback(async () => {
    if (user?.id) {
      await warmCache(user.id, () =>
        AnalyticsPreferencesService.getEffectivePreferences(user.id)
      );
    }
  }, [user?.id]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (user?.id) {
      // Warm up cache first, then load
      warmUpCache().then(() => {
        loadPreferences();
      });
    } else {
      setState(initialState);
    }
  }, [user?.id, loadPreferences, warmUpCache]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      // Optional: could cleanup expired entries on unmount
      preferencesCache.cleanup();
    };
  }, []);

  // ==================== COMPUTED VALUES ====================
  const isUsingDefaults = state.preferences
    ? AnalyticsPreferencesService.areDefaultPreferences(state.preferences)
    : true;

  const getAnalyticsOptions = useCallback(() => {
    if (!state.preferences) return null;

    return {
      spendingPatternsDays: state.preferences.spending_patterns_days,
      monthlyInsightsMonths: state.preferences.monthly_insights_months,
      forecastDays: state.preferences.forecast_days,
      includePsychological: state.preferences.enable_psychological_insights,
      refreshInterval: state.preferences.cache_interval,
    };
  }, [state.preferences]);

  // ==================== RETURN VALUE ====================
  return {
    // State
    ...state,
    isUsingDefaults,

    // Actions
    loadPreferences,
    updatePreferences,
    resetPreferences,

    // Cache management
    clearCache,
    refreshPreferences,
    getCacheStats,

    // Batch updates
    updateTimePreferences,
    updateUIPreferences,
    updateFeaturePreferences,
    updateLocalizationPreferences,


    // Computed values
    getAnalyticsOptions,

    // Performance metrics
    performance: {
      isCached: state.isCached,
      cacheStats: state.cacheStats,
      lastSaved: state.lastSaved,
    },

    // Quick access to common preferences
    defaultTab: state.preferences?.default_tab || 'insights',
    showQuickStats: state.preferences?.show_quick_stats ?? true,
    preferredLanguage: state.preferences?.preferred_language || 'es',
    currency: state.preferences?.currency || 'UYU',
    cacheInterval: state.preferences?.cache_interval || 300000,

    // Feature flags from preferences
    featuresEnabled: state.preferences
      ? {
          psychologicalInsights:
            state.preferences.enable_psychological_insights,
          spendingForecast: state.preferences.enable_spending_forecast,
          pushNotifications: state.preferences.enable_push_notifications,
        }
      : null,
  };
};
