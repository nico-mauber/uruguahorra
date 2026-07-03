/**
 * Servicio de preferencias de analytics por usuario.
 * Fuente: docs/api/contracts-and-data-mapping.md §2.11/§3,
 * docs/features/analytics/analytics-functional-specs.md (CU-2).
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - La fila se conserva en snake_case (coincide con los defaults de §2.11).
 * - `update` sólo envía los campos tocados; el RPC hace COALESCE del resto.
 * - No existe módulo ANALYTICS en el logger → se usa LogModule.DB.
 * - A diferencia de las lecturas de analytics (no críticas), aquí se relanza en
 *   error para que la UI muestre el toast de fallo y revierta el control (CU-2).
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import type {
  AnalyticsPreferences,
  AnalyticsPreferencesPatch,
} from '@/types/analytics';

/** Mapa patch (snake_case) → nombre de parámetro `p_` del RPC de update. */
const PATCH_TO_PARAM: Record<keyof AnalyticsPreferencesPatch, string> = {
  spending_patterns_days: 'p_spending_patterns_days',
  monthly_insights_months: 'p_monthly_insights_months',
  forecast_days: 'p_forecast_days',
  default_tab: 'p_default_tab',
  show_quick_stats: 'p_show_quick_stats',
  max_insights_per_type: 'p_max_insights_per_type',
  hide_completed_insights: 'p_hide_completed_insights',
  prefer_high_impact_insights: 'p_prefer_high_impact_insights',
  enable_psychological_insights: 'p_enable_psychological_insights',
  enable_spending_forecast: 'p_enable_spending_forecast',
  enable_push_notifications: 'p_enable_push_notifications',
  enable_export_functionality: 'p_enable_export_functionality',
  preferred_language: 'p_preferred_language',
  currency: 'p_currency',
  date_format: 'p_date_format',
  cache_interval: 'p_cache_interval',
  auto_refresh: 'p_auto_refresh',
};

export class AnalyticsPreferencesService {
  /** Obtiene (o crea con defaults) las preferencias del usuario. */
  static async getOrCreate(userId: string): Promise<AnalyticsPreferences> {
    try {
      const { data, error } = await supabase.rpc(
        'get_or_create_analytics_preferences',
        { p_user_id: userId }
      );
      if (error) throw error;
      // El RPC puede devolver la fila directa o un array de una fila.
      const row = (Array.isArray(data) ? data[0] : data) as AnalyticsPreferences;
      return row;
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo preferencias de analytics', error);
      throw error;
    }
  }

  /**
   * Actualiza sólo los campos tocados (el RPC COALESCE conserva el resto).
   * Devuelve la fila actualizada.
   */
  static async update(
    userId: string,
    patch: AnalyticsPreferencesPatch
  ): Promise<AnalyticsPreferences> {
    try {
      const params: Record<string, unknown> = { p_user_id: userId };
      (Object.keys(patch) as Array<keyof AnalyticsPreferencesPatch>).forEach(
        (key) => {
          const value = patch[key];
          if (value !== undefined) {
            params[PATCH_TO_PARAM[key]] = value;
          }
        }
      );

      const { data, error } = await supabase.rpc(
        'update_analytics_preferences',
        params
      );
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as AnalyticsPreferences;
      return row;
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando preferencias de analytics', error);
      throw error;
    }
  }

  /** Restaura las preferencias a sus valores por defecto. */
  static async reset(userId: string): Promise<AnalyticsPreferences> {
    try {
      const { data, error } = await supabase.rpc(
        'reset_analytics_preferences',
        { p_user_id: userId }
      );
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as AnalyticsPreferences;
      return row;
    } catch (error) {
      logger.error(LogModule.DB, 'Error restaurando preferencias de analytics', error);
      throw error;
    }
  }
}
