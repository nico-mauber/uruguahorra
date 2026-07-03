/**
 * XPService — otorgamiento de XP (user_xp_log + users.total_xp).
 * Fuente: docs/features/gamification/gamification-functional-specs.md §1,
 * docs/api/contracts-and-data-mapping.md §2.9, §6.
 *
 * Los errores de gamificación en flujos de dinero son NO-bloqueantes:
 * se loguea y el flujo principal continúa (nunca se propaga la excepción).
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { LevelsService } from './LevelsService';
import type { ContributionResult } from '@/types/gamification';

/** Tipos de evento de XP (deben coincidir con la BD). */
export type XPEventType =
  | 'contribution'
  | 'challenge_complete'
  | 'challenge_session_complete'
  | 'daily_streak'
  | 'quest_complete'
  | 'squad_contribution';

/**
 * Montos fijos de XP por evento (§1). La contribución a meta es dinámica
 * (ver contributionXP); squad_contribution lo otorga el trigger de BD.
 */
export const XP_REWARDS = {
  /** Completar reto legacy. */
  challenge_complete: 30,
  /** Completar sesión de reto (default; el real viene en event_data.xpAmount). */
  challenge_session_complete: 50,
  /** Día de racha consecutivo. */
  daily_streak: 5,
  /** Quest semanal completa. */
  quest_complete: 50,
  /** Contribución a pod (lo inserta el trigger de BD; el cliente NO lo otorga). */
  squad_contribution: 15,
  /** Registrar transacción (campo xp_earned del insert). */
  transaction: 5,
} as const;

/** Detecta el error "relation does not exist" (tabla ausente → degradar). */
function isRelationMissing(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === '42P01') return true;
  return typeof e.message === 'string' && /relation .* does not exist/i.test(e.message);
}

export class XPService {
  /** Contribución a meta: min(floor(monto)*2, 10). */
  static contributionXP(amount: number): number {
    const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
    return Math.min(Math.floor(safe) * 2, 10);
  }

  /**
   * Registra XP en user_xp_log. Devuelve el XP otorgado.
   * Tolerancia: si la tabla no existe, devuelve xpEarned sin registrar (warn).
   * Nunca propaga: cualquier error se loguea y se devuelve xpEarned.
   */
  static async awardXP(
    userId: string,
    eventType: XPEventType,
    xpEarned: number,
    eventData?: Record<string, unknown>
  ): Promise<number> {
    if (xpEarned <= 0) {
      logger.warn(LogModule.DB, `awardXP con xp<=0 (${eventType}), se omite`);
      return 0;
    }

    try {
      const { error } = await supabase.from('user_xp_log').insert({
        user_id: userId,
        event_type: eventType,
        xp_earned: xpEarned,
        event_data: eventData ?? {},
      });

      if (error) {
        if (isRelationMissing(error)) {
          logger.warn(
            LogModule.DB,
            'user_xp_log no existe; se otorga XP sin registrar',
            error
          );
          return xpEarned;
        }
        logger.error(LogModule.DB, 'Error registrando XP en user_xp_log', error);
      }
    } catch (error) {
      logger.error(LogModule.DB, 'Excepción en awardXP', error);
    }

    return xpEarned;
  }
}

/**
 * OptimizedGamificationService — ruta caliente del ahorro rápido.
 * Una sola pasada: XP → INSERT log → UPDATE users.total_xp → recalcula nivel.
 * Evita la cascada completa de gamificación (§1).
 */
export class OptimizedGamificationService {
  /**
   * Procesa el XP de una contribución. NO-bloqueante: ante cualquier error
   * devuelve {xpEarned:0, levelUp:false} y loguea.
   */
  static async processContributionOptimized(
    userId: string,
    amount: number
  ): Promise<ContributionResult> {
    const xpEarned = XPService.contributionXP(amount);
    if (xpEarned <= 0) {
      return { xpEarned: 0, levelUp: false };
    }

    try {
      // Leer XP actual.
      const { data, error: readError } = await supabase
        .from('users')
        .select('total_xp')
        .eq('id', userId)
        .single();

      if (readError) {
        logger.warn(LogModule.DB, 'No se pudo leer total_xp (contribución)', readError);
        return { xpEarned: 0, levelUp: false };
      }

      const oldXP = ((data as { total_xp?: number } | null)?.total_xp ?? 0) || 0;
      const newXP = oldXP + xpEarned;

      // Registrar en el log auditable (best-effort, no bloquea).
      await XPService.awardXP(userId, 'contribution', xpEarned, { amount });

      // Actualizar el total del usuario.
      const { error: updateError } = await supabase
        .from('users')
        .update({ total_xp: newXP })
        .eq('id', userId);

      if (updateError) {
        logger.warn(LogModule.DB, 'No se pudo actualizar total_xp', updateError);
        return { xpEarned: 0, levelUp: false };
      }

      const oldLevel = LevelsService.getLevel(oldXP);
      const newLevel = LevelsService.getLevel(newXP);

      return {
        xpEarned,
        levelUp: newLevel > oldLevel,
        newLevel,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Excepción en processContributionOptimized', error);
      return { xpEarned: 0, levelUp: false };
    }
  }
}
