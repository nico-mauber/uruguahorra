import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import {
  AnalyticsService,
  type SpendingPattern,
  type MonthlyInsight,
  type PsychologicalInsight,
  type SpendingForecast,
} from '@/services/analytics.service';
import { logger, LogModule } from '@/utils/logger';
import { ENV_CONFIG, RUNTIME_CONFIG } from '@/config/env.config';
import {
  ANALYTICS_TIME_PERIODS,
  DATA_VALIDATION,
} from '@/config/analytics.config';

interface AnalyticsState {
  spendingPatterns: SpendingPattern[];
  monthlyInsights: MonthlyInsight[];
  psychologicalInsights: PsychologicalInsight[];
  forecast: SpendingForecast | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
  metadata?: {
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
    };
  };
}

interface AnalyticsOptions {
  spendingPatternsDays?: number;
  monthlyInsightsMonths?: number;
  forecastDays?: number;
  includePsychological?: boolean;
  refreshInterval?: number;
  forceRefresh?: boolean;
}

const initialState: AnalyticsState = {
  spendingPatterns: [],
  monthlyInsights: [],
  psychologicalInsights: [],
  forecast: null,
  isLoading: false,
  error: null,
  lastFetch: null,
};

/**
 * Hook personalizado para manejo de analytics financiero
 * Implementa cache inteligente, configuración externa y patrones psicológicos
 *
 * @param options - Configuración del hook
 * @returns Estado y funciones para manejo de analytics
 */
export const useSpendingAnalytics = (
  options?: AnalyticsOptions | null
) => {
  // Handle null/undefined options (when preferences haven't loaded yet)
  const safeOptions = options ?? {};
  
  const {
    spendingPatternsDays = ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS,
    monthlyInsightsMonths = ANALYTICS_TIME_PERIODS.DEFAULT_MONTHLY_INSIGHTS_MONTHS,
    forecastDays = ANALYTICS_TIME_PERIODS.DEFAULT_FORECAST_DAYS,
    includePsychological = true,
    refreshInterval = ENV_CONFIG.CACHE_INTERVAL,
    forceRefresh = false,
  } = safeOptions;

  const { user } = useAuth();
  const [state, setState] = useState<AnalyticsState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastOptionsRef = useRef<string>('');

  // Cache inteligente: evitar fetch excesivos
  const shouldFetch = useCallback(() => {
    // Always fetch if forced or no previous fetch
    if (forceRefresh || !state.lastFetch) return true;

    // Check if analytics are disabled
    if (!RUNTIME_CONFIG.featuresEnabled.analytics) return false;

    // Check time-based cache
    const timeDiff = Date.now() - state.lastFetch.getTime();
    const shouldRefreshByTime = timeDiff > refreshInterval;

    // Check if options changed (for dynamic updates)
    const currentOptionsHash = JSON.stringify({
      spendingPatternsDays,
      monthlyInsightsMonths,
      forecastDays,
    });
    const optionsChanged = currentOptionsHash !== lastOptionsRef.current;

    return shouldRefreshByTime || optionsChanged;
  }, [
    state.lastFetch,
    refreshInterval,
    forceRefresh,
    spendingPatternsDays,
    monthlyInsightsMonths,
    forecastDays,
  ]);

  const fetchAnalytics = useCallback(
    async (force = false) => {
      if (!user?.id) {
        logger.warn(LogModule.DB, 'No user ID available for analytics fetch');
        return;
      }

      if (state.isLoading && !force) {
        logger.info(LogModule.DB, 'Analytics fetch already in progress');
        return;
      }

      if (!force && !shouldFetch()) {
        logger.info(
          LogModule.DB,
          'Skipping analytics fetch - cache still valid'
        );
        return;
      }

      // Cancel previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        logger.start(LogModule.DB, 'Fetching complete analytics', {
          userId: user.id,
          options: {
            spendingPatternsDays,
            monthlyInsightsMonths,
            forecastDays,
            includePsychological,
          },
          cacheInterval: refreshInterval,
          forceRefresh: force,
        });

        // Update options hash for change detection
        lastOptionsRef.current = JSON.stringify({
          spendingPatternsDays,
          monthlyInsightsMonths,
          forecastDays,
        });

        // Use the new complete analytics method for better performance
        const analyticsData = await AnalyticsService.getCompleteAnalytics(
          user.id,
          {
            spendingPatternsDays,
            monthlyInsightsMonths,
            forecastDays,
            includePsychological,
          }
        );

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          logger.info(LogModule.DB, 'Analytics fetch aborted');
          return;
        }

        setState({
          spendingPatterns: analyticsData.spendingPatterns,
          monthlyInsights: analyticsData.monthlyInsights,
          psychologicalInsights: analyticsData.psychologicalInsights,
          forecast: analyticsData.forecast,
          metadata: analyticsData.metadata,
          isLoading: false,
          error: null,
          lastFetch: new Date(),
        });

        logger.success(LogModule.DB, 'Analytics data fetched successfully', {
          patternsCount: analyticsData.spendingPatterns.length,
          insightsCount: analyticsData.monthlyInsights.length,
          psychologicalCount: analyticsData.psychologicalInsights.length,
          hasForecast: !!analyticsData.forecast,
        });
      } catch (error) {
        // Don't update state if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        logger.error(LogModule.DB, 'Failed to fetch analytics', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        }));
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      user?.id,
      state.isLoading,
      shouldFetch,
      spendingPatternsDays,
      monthlyInsightsMonths,
      forecastDays,
      includePsychological,
      refreshInterval,
    ]
  );

  // Auto-fetch on mount and user change
  useEffect(() => {
    if (user?.id && RUNTIME_CONFIG.featuresEnabled.analytics) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Solo cuando cambia el user ID

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Helpers para filtrar insights por tipo psicológico
  const getInsightsByType = useCallback(
    (type: PsychologicalInsight['type']) =>
      state.psychologicalInsights.filter((insight) => insight.type === type),
    [state.psychologicalInsights]
  );

  // Helper para obtener categoría con mayor gasto
  const getTopSpendingCategory = useCallback(() => {
    if (state.spendingPatterns.length === 0) return null;
    return state.spendingPatterns.reduce((top, pattern) =>
      pattern.amount > top.amount ? pattern : top
    );
  }, [state.spendingPatterns]);

  // Helper para calcular tendencia general de gasto
  const getOverallTrend = useCallback(() => {
    if (state.monthlyInsights.length < 2) return 'stable';

    const latest = state.monthlyInsights[0];
    const previous = state.monthlyInsights[1];

    if (latest.totalSpent > previous.totalSpent * 1.1) return 'up';
    if (latest.totalSpent < previous.totalSpent * 0.9) return 'down';
    return 'stable';
  }, [state.monthlyInsights]);

  // Refresh manual para pull-to-refresh
  const refreshAnalytics = useCallback(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  return {
    // Data state
    ...state,

    // Actions
    refreshAnalytics,

    // Computed helpers
    getInsightsByType,
    getTopSpendingCategory,
    getOverallTrend,

    // Status helpers
    hasData:
      state.spendingPatterns.length > 0 || state.monthlyInsights.length > 0,
    shouldRefresh: shouldFetch(),

    // Configuration helpers
    isFeatureEnabled: (feature: keyof typeof RUNTIME_CONFIG.featuresEnabled) =>
      RUNTIME_CONFIG.featuresEnabled[feature],
    getCurrentOptions: () => ({
      spendingPatternsDays,
      monthlyInsightsMonths,
      forecastDays,
      includePsychological,
      refreshInterval,
    }),

    // Validation helpers
    isDataValid: () => {
      const hasMinTransactions =
        state.spendingPatterns.reduce((sum, p) => sum + p.frequency, 0) >=
        DATA_VALIDATION.MIN_TRANSACTIONS_FOR_INSIGHTS;
      const hasMinData = state.monthlyInsights.length >= 1;
      return hasMinTransactions && hasMinData;
    },

    // Performance metrics
    getPerformanceMetrics: () => ({
      cacheHitRatio: state.lastFetch
        ? (Date.now() - state.lastFetch.getTime()) / refreshInterval
        : 0,
      dataFreshness: state.lastFetch
        ? Date.now() - state.lastFetch.getTime()
        : null,
      lastFetchDuration: state.metadata?.performance || null,
    }),
  };
};

// Export helper function for creating analytics options
export const createAnalyticsOptions = (
  overrides: Partial<AnalyticsOptions> = {}
): AnalyticsOptions => ({
  spendingPatternsDays: ANALYTICS_TIME_PERIODS.DEFAULT_SPENDING_PATTERNS_DAYS,
  monthlyInsightsMonths: ANALYTICS_TIME_PERIODS.DEFAULT_MONTHLY_INSIGHTS_MONTHS,
  forecastDays: ANALYTICS_TIME_PERIODS.DEFAULT_FORECAST_DAYS,
  includePsychological: true,
  refreshInterval: ENV_CONFIG.CACHE_INTERVAL,
  forceRefresh: false,
  ...overrides,
});

// Export type for external use
export type { AnalyticsOptions, AnalyticsState };
