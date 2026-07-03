import { create } from 'zustand';
import { AnalyticsService } from '@/services/AnalyticsService';
import { AnalyticsPreferencesService } from '@/services/AnalyticsPreferencesService';
import { ForecastService } from '@/services/ForecastService';
import { buildAnalysisData, generateInsights } from '@/services/insightsEngine';
import { logger, LogModule } from '@/lib/logger';
import type {
  AnalyticsPreferences,
  AnalyticsPreferencesPatch,
  EnhancedAnalytics,
  Forecast,
  MonthlyInsight,
  PsychologicalInsight,
  SpendingPattern,
  TransactionSummary,
} from '@/types/analytics';

/**
 * Store de análisis financiero. Fuente: docs/architecture/state-management,
 * docs/features/analytics/analytics-functional-specs.md (CU-1/CU-2).
 * Las lecturas de analytics son NO críticas (los servicios devuelven []/null
 * ante error); el error de carga global sólo se marca si `loadAll` lanza.
 */
interface AnalyticsState {
  preferences: AnalyticsPreferences | null;
  patterns: SpendingPattern[];
  monthlyInsights: MonthlyInsight[];
  summary: TransactionSummary | null;
  enhanced: EnhancedAnalytics | null;
  insights: PsychologicalInsight[];
  forecast: Forecast | null;
  isLoading: boolean;
  error: string | null;
  /** true si hay datos reales (patrones o insights mensuales con filas). */
  hasRealData: boolean;

  loadPreferences: (userId: string) => Promise<void>;
  loadAll: (userId: string) => Promise<void>;
  updatePreference: (
    userId: string,
    patch: AnalyticsPreferencesPatch
  ) => Promise<boolean>;
  resetPreferences: (userId: string) => Promise<void>;
  clearStore: () => void;
}

const INITIAL: Omit<
  AnalyticsState,
  | 'loadPreferences'
  | 'loadAll'
  | 'updatePreference'
  | 'resetPreferences'
  | 'clearStore'
> = {
  preferences: null,
  patterns: [],
  monthlyInsights: [],
  summary: null,
  enhanced: null,
  insights: [],
  forecast: null,
  isLoading: false,
  error: null,
  hasRealData: false,
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  ...INITIAL,

  loadPreferences: async (userId) => {
    try {
      const preferences = await AnalyticsPreferencesService.getOrCreate(userId);
      set({ preferences });
    } catch (error) {
      logger.warn(LogModule.DB, 'Error cargando preferencias de analytics', error);
    }
  },

  loadAll: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      // 1) Preferencias (crea con defaults si no existen).
      const preferences = await AnalyticsPreferencesService.getOrCreate(userId);

      // 2) Datos en paralelo, gobernados por las preferencias.
      const [patterns, monthlyInsights, summary, enhanced] = await Promise.all([
        AnalyticsService.getSpendingPatterns(
          userId,
          preferences.spending_patterns_days
        ),
        AnalyticsService.getMonthlyInsights(
          userId,
          preferences.monthly_insights_months
        ),
        AnalyticsService.getTransactionSummary(
          userId,
          preferences.spending_patterns_days
        ),
        AnalyticsService.getEnhancedAnalytics(
          userId,
          preferences.spending_patterns_days
        ),
      ]);

      // 3) Insights psicológicos (si están habilitados).
      let insights: PsychologicalInsight[] = [];
      if (preferences.enable_psychological_insights) {
        const analysisData = buildAnalysisData({
          summary,
          enhanced,
          monthlyInsights,
          patterns,
        });
        insights = generateInsights(analysisData, {
          maxPerType: preferences.max_insights_per_type,
          preferHighImpact: preferences.prefer_high_impact_insights,
        });
      }

      // 4) Proyección (si está habilitada).
      const forecast = preferences.enable_spending_forecast
        ? ForecastService.getSpendingForecast(
            monthlyInsights,
            preferences.forecast_days
          )
        : null;

      set({
        preferences,
        patterns,
        monthlyInsights,
        summary,
        enhanced,
        insights,
        forecast,
        hasRealData: patterns.length > 0 || monthlyInsights.length > 0,
        isLoading: false,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error cargando análisis (carga completa)', error);
      set({ isLoading: false, error: 'No se pudo cargar el análisis' });
    }
  },

  updatePreference: async (userId, patch) => {
    try {
      const preferences = await AnalyticsPreferencesService.update(userId, patch);
      set({ preferences, error: null });
      return true;
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando preferencia de analytics', error);
      set({ error: 'Error al guardar la configuración' });
      return false;
    }
  },

  resetPreferences: async (userId) => {
    try {
      const preferences = await AnalyticsPreferencesService.reset(userId);
      set({ preferences, error: null });
    } catch (error) {
      logger.error(LogModule.DB, 'Error restaurando preferencias de analytics', error);
      set({ error: 'No se pudieron restaurar las preferencias' });
    }
  },

  clearStore: () => set({ ...INITIAL }),
}));
