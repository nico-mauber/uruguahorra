/**
 * Servicio de retos (challenges) conductuales con check-in manual diario.
 * Fuente: docs/api/contracts-and-data-mapping.md §2.7/§3,
 * docs/features/challenges/challenges-functional-specs.md (CU-1..CU-3).
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - El cliente NUNCA escribe agregados (`progress`/`xp_earned`/`status`): los
 *   mantienen los RPC/triggers de BD. Excepción: sincroniza `progress` de forma
 *   best-effort tras un check-in para reflejar el valor recién calculado.
 * - No existe módulo CHALLENGES en el logger → se usa LogModule.DB.
 * - Errores: en general se loguean y se relanzan para que el store/UI los mapeen
 *   (los RPC de retos devuelven mensajes en español en `error.message`). Las
 *   operaciones best-effort (progreso, completar, expirar) no relanzan.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import type {
  ChallengeCategoryRow,
  ChallengeRow,
  DailyCheckinRow,
  UserChallengeSessionRow,
} from '@/types/database';
import type { SessionProgress } from '@/types/gamification';

/** Duraciones válidas de una sesión de reto (§2.7). */
export type ChallengeDurationType = '1_week' | '15_days' | '30_days' | '1_year';

/** Fecha de hoy en formato YYYY-MM-DD (fijada en el momento del gesto). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** SessionProgress por defecto cuando el cálculo de progreso falla. */
const DEFAULT_PROGRESS: SessionProgress = {
  currentProgress: 0,
  daysCompleted: 0,
  totalDaysRequired: 0,
  isOnTrack: true,
};

/** Fila cruda devuelta por `calculate_challenge_session_progress` (§3). */
interface ProgressRpcRow {
  current_progress: number;
  days_completed: number;
  total_days_required: number;
  is_on_track: boolean;
}

export class ChallengesService {
  /** Categorías de reto activas, ordenadas por `sort_order` (CU-1). */
  static async getActiveCategories(): Promise<ChallengeCategoryRow[]> {
    try {
      const { data, error } = await supabase
        .from('challenge_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data ?? []) as ChallengeCategoryRow[];
    } catch (error) {
      logger.error(LogModule.DB, 'Error listando categorías de retos', error);
      throw error;
    }
  }

  /** Retos activos de una categoría (CU-1). */
  static async getChallengesByCategory(
    categoryId: string
  ): Promise<ChallengeRow[]> {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true);

      if (error) throw error;
      return (data ?? []) as ChallengeRow[];
    } catch (error) {
      logger.error(LogModule.DB, 'Error listando retos de la categoría', error);
      throw error;
    }
  }

  /** Sesiones activas del usuario con el reto anidado (CU-1). */
  static async getUserActiveSessions(
    userId: string
  ): Promise<UserChallengeSessionRow[]> {
    try {
      const { data, error } = await supabase
        .from('user_challenge_sessions')
        .select('*, challenge:challenges(*)')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      return (data ?? []) as unknown as UserChallengeSessionRow[];
    } catch (error) {
      logger.error(LogModule.DB, 'Error listando sesiones activas de retos', error);
      throw error;
    }
  }

  /**
   * Inicia una sesión de reto (CU-2). El RPC valida duración, reto activo y el
   * límite de 5 sesiones activas; ante error lanza una excepción con mensaje en
   * español que se relanza tal cual para que la UI lo muestre. Devuelve el uuid
   * de la sesión creada.
   */
  static async startSession(
    userId: string,
    challengeId: string,
    durationType: ChallengeDurationType
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('start_challenge_session', {
        p_user_id: userId,
        p_challenge_id: challengeId,
        p_duration_type: durationType,
      });

      if (error) throw error;
      return data as string;
    } catch (error) {
      logger.error(LogModule.DB, 'Error iniciando sesión de reto', error);
      throw error;
    }
  }

  /**
   * Estado del check-in de hoy para una sesión (CU-3). Devuelve la fila o null
   * si aún no hay check-in registrado hoy.
   */
  static async getTodaysCheckinStatus(
    userId: string,
    sessionId: string
  ): Promise<DailyCheckinRow | null> {
    try {
      const { data, error } = await supabase
        .from('daily_challenge_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('checkin_date', todayISO())
        .maybeSingle();

      if (error) throw error;
      return (data as DailyCheckinRow | null) ?? null;
    } catch (error) {
      logger.error(LogModule.DB, 'Error consultando check-in de hoy', error);
      throw error;
    }
  }

  /**
   * Progreso real de la sesión (CU-1/CU-3). El RPC devuelve una tabla (array)
   * con una fila; se normaliza a `SessionProgress` (camelCase). Ante error
   * devuelve un progreso por defecto y advierte (no relanza).
   */
  static async calculateProgress(sessionId: string): Promise<SessionProgress> {
    try {
      const { data, error } = await supabase.rpc(
        'calculate_challenge_session_progress',
        { p_session_id: sessionId }
      );

      if (error) throw error;

      const row = (
        Array.isArray(data) ? data[0] : data
      ) as ProgressRpcRow | undefined;
      if (!row) return { ...DEFAULT_PROGRESS };

      return {
        currentProgress: row.current_progress ?? 0,
        daysCompleted: row.days_completed ?? 0,
        totalDaysRequired: row.total_days_required ?? 0,
        isOnTrack: row.is_on_track ?? true,
      };
    } catch (error) {
      logger.warn(LogModule.DB, 'Error calculando progreso de sesión', error);
      return { ...DEFAULT_PROGRESS };
    }
  }

  /**
   * Registra (UPSERT) el check-in del día (CU-3 paso 3a). Fija la fecha en el
   * momento del gesto (importante para el flujo offline).
   */
  static async recordCheckin(
    userId: string,
    sessionId: string,
    completed: boolean,
    note?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('record_challenge_daily_checkin', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_completed: completed,
        p_checkin_date: todayISO(),
        p_note: note ?? null,
      });

      if (error) throw error;
    } catch (error) {
      logger.error(LogModule.DB, 'Error registrando check-in diario', error);
      throw error;
    }
  }

  /**
   * Completa la sesión automáticamente si corresponde (CU-3 paso 3c). El RPC
   * sólo completa si el progreso es 100 y los días están cumplidos; otorga XP y
   * registra el log. No fatal: ante error devuelve false y advierte.
   */
  static async completeSessionIfDone(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc(
        'complete_challenge_session_automatically',
        { p_session_id: sessionId }
      );

      if (error) throw error;
      return Boolean(data);
    } catch (error) {
      logger.warn(LogModule.DB, 'Error completando sesión de reto', error);
      return false;
    }
  }

  /**
   * Orquestación del check-in diario (CU-3 paso 3): registra el check-in,
   * recalcula el progreso, sincroniza `progress` de la sesión (best-effort) y,
   * si el reto está cumplido (progreso ≥ 100 y días requeridos alcanzados),
   * intenta completarlo. Devuelve el progreso y si la sesión quedó completada.
   */
  static async performDailyCheckin(
    userId: string,
    sessionId: string,
    completed: boolean,
    note?: string
  ): Promise<{ progress: SessionProgress; wasCompleted: boolean }> {
    // (a) Registrar el check-in del día (relanza si falla).
    await this.recordCheckin(userId, sessionId, completed, note);

    // (b) Recalcular progreso real (best-effort dentro del propio método).
    const progress = await this.calculateProgress(sessionId);

    // Sincronizar `progress` de la sesión (best-effort; no bloquea el flujo).
    try {
      const { error } = await supabase
        .from('user_challenge_sessions')
        .update({ progress: progress.currentProgress })
        .eq('id', sessionId);
      if (error) throw error;
    } catch (error) {
      logger.warn(LogModule.DB, 'No se pudo sincronizar el progreso de la sesión', error);
    }

    // (c) Completar si el reto está cumplido.
    let wasCompleted = false;
    if (
      progress.currentProgress >= 100 &&
      progress.daysCompleted >= progress.totalDaysRequired
    ) {
      wasCompleted = await this.completeSessionIfDone(sessionId);
    }

    return { progress, wasCompleted };
  }

  /**
   * Expira las sesiones activas vencidas (RPC batch). Best-effort: se invoca al
   * cargar la pantalla; ante error sólo advierte (no relanza).
   */
  static async expireSessions(): Promise<void> {
    try {
      const { error } = await supabase.rpc('expire_challenge_sessions');
      if (error) throw error;
    } catch (error) {
      logger.warn(LogModule.DB, 'Error expirando sesiones de retos', error);
    }
  }

  /** Cantidad de sesiones completadas del usuario (para el perfil). Best-effort → 0. */
  static async getCompletedSessionsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_challenge_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');
      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      logger.warn(LogModule.DB, 'Error contando retos completados', error);
      return 0;
    }
  }
}
