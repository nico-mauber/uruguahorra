/**
 * StreaksService — rachas (user_streaks, fila única por usuario).
 * Fuente: docs/features/gamification/gamification-functional-specs.md §3,
 * docs/api/contracts-and-data-mapping.md §2.9, §3 (RPC get_or_create_user_streak).
 *
 * Errores NO-bloqueantes: se loguea (warn) y se devuelve el mejor esfuerzo.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { XPService } from './XPService';
import type { StreakData } from '@/types/gamification';

const DAY_MS = 86_400_000;
const BREAK_MS = 48 * 60 * 60 * 1000; // 48h → racha en riesgo de romperse.
/** 1 protección por mes (regla efectiva del código). */
const PROTECTIONS_PER_MONTH = 1;

/** Fila cruda de user_streaks (subset consumido). */
interface StreakRow {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string | null;
  streak_protections_used: number;
  protection_reset_date: string | null;
}

function toStreakData(row: StreakRow): StreakData {
  return {
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    lastActivityAt: row.last_activity_at ?? null,
    streakProtectionsUsed: row.streak_protections_used ?? 0,
    protectionResetDate: row.protection_reset_date ?? null,
  };
}

/** Día 1 del mes próximo (ISO), para reiniciar el contador de protecciones. */
function firstDayOfNextMonth(nowMs: number): string {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}

export class StreaksService {
  /**
   * ¿Hay protección disponible?
   * Si now > protection_reset_date → contador reseteado (disponible);
   * si no, used < PROTECTIONS_PER_MONTH.
   */
  static canUseProtection(row: StreakRow, nowMs: number = Date.now()): boolean {
    const resetMs = row.protection_reset_date
      ? new Date(row.protection_reset_date).getTime()
      : NaN;
    if (Number.isFinite(resetMs) && nowMs > resetMs) return true;
    return (row.streak_protections_used ?? 0) < PROTECTIONS_PER_MONTH;
  }

  /** Obtiene (o crea) la fila de racha vía RPC get_or_create_user_streak. */
  static async getStreak(userId: string): Promise<StreakData> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_user_streak', {
        p_user_id: userId,
      });
      if (error) {
        logger.warn(LogModule.DB, 'get_or_create_user_streak falló', error);
        return StreaksService.emptyStreak();
      }
      const row = StreaksService.normalizeRpcRow(data);
      if (!row) return StreaksService.emptyStreak();
      return toStreakData(row);
    } catch (error) {
      logger.error(LogModule.DB, 'Excepción en getStreak', error);
      return StreaksService.emptyStreak();
    }
  }

  /**
   * Actualiza la racha tras una contribución. Devuelve la StreakData resultante.
   * Casos según días naturales de diferencia con last_activity_at.
   */
  static async updateStreak(
    userId: string,
    timestamp: number = Date.now()
  ): Promise<StreakData> {
    try {
      const existing = await StreaksService.fetchRow(userId);
      const nowIso = new Date(timestamp).toISOString();

      // Sin fila previa → crear con current=1, longest=1.
      if (!existing) {
        return await StreaksService.createInitialRow(userId, timestamp);
      }

      const lastMs = existing.last_activity_at
        ? new Date(existing.last_activity_at).getTime()
        : NaN;

      // Sin actividad previa registrada: tratar como primer día.
      if (!Number.isFinite(lastMs)) {
        return await StreaksService.applyUpdate(userId, {
          current_streak: 1,
          longest_streak: Math.max(existing.longest_streak ?? 0, 1),
          last_activity_at: nowIso,
        });
      }

      const dayDiff = Math.floor(Math.abs(timestamp - lastMs) / DAY_MS);

      // 0 días: sólo actualizar timestamp.
      if (dayDiff === 0) {
        return await StreaksService.applyUpdate(userId, {
          last_activity_at: nowIso,
        });
      }

      // 1 día (consecutivo): +1, actualizar longest, otorgar 5 XP.
      if (dayDiff === 1) {
        const current = (existing.current_streak ?? 0) + 1;
        const longest = Math.max(existing.longest_streak ?? 0, current);
        const updated = await StreaksService.applyUpdate(userId, {
          current_streak: current,
          longest_streak: longest,
          last_activity_at: nowIso,
        });
        await XPService.awardXP(userId, 'daily_streak', 5);
        return updated;
      }

      // >1 día.
      const gapMs = Math.abs(timestamp - lastMs);
      if (gapMs > BREAK_MS) {
        // Pasaron >48h: intentar protección.
        if (StreaksService.canUseProtection(existing, timestamp)) {
          const resetMs = existing.protection_reset_date
            ? new Date(existing.protection_reset_date).getTime()
            : NaN;
          // Si el reset ya venció, el contador se reinicia al consumir.
          const alreadyReset = Number.isFinite(resetMs) && timestamp > resetMs;
          const used = (alreadyReset ? 0 : existing.streak_protections_used ?? 0) + 1;
          return await StreaksService.applyUpdate(userId, {
            streak_protections_used: used,
            last_activity_at: nowIso,
            ...(alreadyReset
              ? { protection_reset_date: firstDayOfNextMonth(timestamp) }
              : {}),
          });
        }
        // Sin protección: reset.
        return await StreaksService.applyUpdate(userId, {
          current_streak: 1,
          last_activity_at: nowIso,
        });
      }

      // >1 día pero dentro de las 48h de gracia: mantener y actualizar timestamp.
      return await StreaksService.applyUpdate(userId, {
        last_activity_at: nowIso,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Excepción en updateStreak', error);
      return StreaksService.emptyStreak();
    }
  }

  // ---- helpers internos ----

  private static emptyStreak(): StreakData {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityAt: null,
      streakProtectionsUsed: 0,
      protectionResetDate: null,
    };
  }

  /** RPC puede devolver la fila directa o un array con una fila. */
  private static normalizeRpcRow(data: unknown): StreakRow | null {
    if (Array.isArray(data)) {
      return (data[0] as StreakRow | undefined) ?? null;
    }
    if (data && typeof data === 'object') {
      return data as StreakRow;
    }
    return null;
  }

  private static async fetchRow(userId: string): Promise<StreakRow | null> {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logger.warn(LogModule.DB, 'No se pudo leer user_streaks', error);
      return null;
    }
    return (data as StreakRow | null) ?? null;
  }

  private static async createInitialRow(
    userId: string,
    timestamp: number
  ): Promise<StreakData> {
    const nowIso = new Date(timestamp).toISOString();
    const row: StreakRow = {
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_at: nowIso,
      streak_protections_used: 0,
      protection_reset_date: firstDayOfNextMonth(timestamp),
    };
    const { data, error } = await supabase
      .from('user_streaks')
      .insert(row)
      .select()
      .single();
    if (error) {
      logger.warn(LogModule.DB, 'No se pudo crear user_streaks', error);
      return toStreakData(row);
    }
    return toStreakData((data as StreakRow) ?? row);
  }

  private static async applyUpdate(
    userId: string,
    patch: Partial<StreakRow>
  ): Promise<StreakData> {
    const { data, error } = await supabase
      .from('user_streaks')
      .update(patch)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      logger.warn(LogModule.DB, 'No se pudo actualizar user_streaks', error);
      // Mejor esfuerzo: devolver lo que se intentó escribir.
      return toStreakData({
        user_id: userId,
        current_streak: patch.current_streak ?? 0,
        longest_streak: patch.longest_streak ?? 0,
        last_activity_at: patch.last_activity_at ?? null,
        streak_protections_used: patch.streak_protections_used ?? 0,
        protection_reset_date: patch.protection_reset_date ?? null,
      });
    }
    return toStreakData(data as StreakRow);
  }
}
