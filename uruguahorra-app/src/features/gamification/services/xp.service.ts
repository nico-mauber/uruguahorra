import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import type { XPEventType, XPLogEntry } from '../types/gamification.types';
import {
  calculateContributionXP,
  calculateChallengeXP,
  calculateStreakXP,
  calculateQuestXP,
} from '../utils/formulas';

export class XPService {
  /**
   * Función principal para otorgar XP
   */
  static async awardXP(
    userId: string,
    eventType: XPEventType,
    eventData: Record<string, unknown> = {}
  ): Promise<number> {
    try {
      logger.start(LogModule.DB, `Otorgando XP por ${eventType}`, {
        userId,
        eventData,
      });

      let xpEarned: number;

      switch (eventType) {
        case 'contribution':
          xpEarned = calculateContributionXP(
            typeof eventData.amount === 'number' ? eventData.amount : 0
          );
          break;
        case 'challenge_complete':
          xpEarned = calculateChallengeXP();
          break;
        case 'challenge_session_complete':
          // Para challenge sessions, usar el XP directamente del eventData
          xpEarned =
            typeof eventData.xpAmount === 'number' ? eventData.xpAmount : 50;
          break;
        case 'daily_streak':
          xpEarned = calculateStreakXP();
          break;
        case 'quest_complete':
          xpEarned = calculateQuestXP();
          break;
        default:
          throw new Error(`Tipo de evento XP no válido: ${eventType}`);
      }

      if (xpEarned <= 0) {
        logger.warn(LogModule.DB, 'No se otorgó XP (cantidad = 0)', {
          eventType,
          eventData,
        });
        return 0;
      }

      // Registrar en log de XP
      const { data: logEntry, error: logError } = await supabase
        .from('user_xp_log')
        .insert({
          user_id: userId,
          event_type: eventType,
          xp_earned: xpEarned,
          event_data: eventData,
        })
        .select()
        .single();

      if (logError) {
        logger.error(LogModule.DB, 'Error registrando XP en log', logError);

        // Si es error de tabla no encontrada, retornar XP pero no fallar
        if (
          logError.message?.includes(
            'relation "public.user_xp_log" does not exist'
          ) ||
          logError.message?.includes('Could not find the table')
        ) {
          logger.warn(
            LogModule.DB,
            'Tabla user_xp_log no existe, XP otorgado pero no registrado',
            { xpEarned }
          );
          return xpEarned;
        }
        throw logError;
      }

      logger.success(LogModule.DB, `${xpEarned} XP otorgado exitosamente`, {
        eventType,
        xpEarned,
        logEntryId: logEntry.id,
      });

      return xpEarned;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal otorgando XP', error);
      throw error;
    }
  }

  /**
   * Otorgar XP por contribución monetaria
   */
  static async awardContributionXP(
    userId: string,
    amount: number
  ): Promise<number> {
    return this.awardXP(userId, 'contribution', { amount });
  }

  /**
   * Otorgar XP por completar challenge
   */
  static async awardChallengeXP(
    userId: string,
    challengeId: string
  ): Promise<number> {
    return this.awardXP(userId, 'challenge_complete', { challengeId });
  }

  /**
   * Otorgar XP por racha diaria
   */
  static async awardStreakXP(
    userId: string,
    streakDay: number
  ): Promise<number> {
    return this.awardXP(userId, 'daily_streak', { streakDay });
  }

  /**
   * Otorgar XP por completar quest semanal
   */
  static async awardQuestXP(userId: string, questId: string): Promise<number> {
    return this.awardXP(userId, 'quest_complete', { questId });
  }

  /**
   * Obtener XP total del usuario
   */
  static async getUserTotalXP(userId: string): Promise<number> {
    try {
      logger.database(LogModule.DB, 'Obteniendo XP total del usuario', {
        userId,
      });

      const { data, error } = await supabase
        .from('user_xp_log')
        .select('xp_earned')
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo XP total', error);

        // Si es error de tabla no encontrada, retornar 0 en lugar de fallar
        if (
          error.message?.includes(
            'relation "public.user_xp_log" does not exist'
          ) ||
          error.message?.includes('Could not find the table')
        ) {
          logger.warn(
            LogModule.DB,
            'Tabla user_xp_log no existe, retornando XP = 0'
          );
          return 0;
        }
        throw error;
      }

      const totalXP = (data || []).reduce(
        (sum, entry) => sum + entry.xp_earned,
        0
      );

      logger.success(LogModule.DB, `XP total calculado: ${totalXP}`, {
        userId,
      });
      return totalXP;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal obteniendo XP total', error);

      // Si es error de tabla no encontrada, retornar 0 en lugar de fallar
      if (
        error instanceof Error &&
        (error.message?.includes(
          'relation "public.user_xp_log" does not exist'
        ) ||
          error.message?.includes('Could not find the table'))
      ) {
        logger.warn(
          LogModule.DB,
          'Tabla user_xp_log no existe, retornando XP = 0'
        );
        return 0;
      }
      throw error;
    }
  }

  /**
   * Obtener historial de XP del usuario
   */
  static async getXPHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<XPLogEntry[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo historial de XP', {
        userId,
        limit,
        offset,
      });

      const { data, error } = await supabase
        .from('user_xp_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo historial de XP', error);

        // Si es error de tabla no encontrada, retornar array vacío
        if (
          error.message?.includes(
            'relation "public.user_xp_log" does not exist'
          ) ||
          error.message?.includes('Could not find the table')
        ) {
          logger.warn(
            LogModule.DB,
            'Tabla user_xp_log no existe, retornando historial vacío'
          );
          return [];
        }
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} entradas de XP obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo historial de XP',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener estadísticas de XP por período
   */
  static async getXPStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalXP: number;
    xpByEventType: Record<XPEventType, number>;
    dailyXP: Record<string, number>;
  }> {
    try {
      logger.database(LogModule.DB, 'Obteniendo estadísticas de XP', {
        userId,
        startDate,
        endDate,
      });

      let query = supabase
        .from('user_xp_log')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query.order('created_at', {
        ascending: true,
      });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo estadísticas de XP',
          error
        );
        throw error;
      }

      const entries = data || [];
      const totalXP = entries.reduce((sum, entry) => sum + entry.xp_earned, 0);

      // Agrupar por tipo de evento
      const xpByEventType: Record<XPEventType, number> = {
        contribution: 0,
        challenge_complete: 0,
        challenge_session_complete: 0,
        daily_streak: 0,
        quest_complete: 0,
      };

      // Agrupar por día
      const dailyXP: Record<string, number> = {};

      entries.forEach((entry) => {
        // Por tipo de evento
        if (entry.event_type in xpByEventType) {
          xpByEventType[entry.event_type as XPEventType] =
            (xpByEventType[entry.event_type as XPEventType] || 0) +
            entry.xp_earned;
        }

        // Por día
        const day = entry.created_at.split('T')[0]; // YYYY-MM-DD
        dailyXP[day] = (dailyXP[day] || 0) + entry.xp_earned;
      });

      const stats = {
        totalXP,
        xpByEventType,
        dailyXP,
      };

      logger.success(LogModule.DB, 'Estadísticas de XP calculadas', stats);
      return stats;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo estadísticas de XP',
        error
      );
      throw error;
    }
  }
}
