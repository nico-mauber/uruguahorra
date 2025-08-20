/**
 * Optimizaciones específicas para el flujo de ahorro rápido
 */

import { logger, LogModule } from '@/utils/logger';
import { XPService } from '@/features/gamification/services/xp.service';
import { LevelsService } from '@/features/gamification/services/levels.service';

// Cache en memoria simple para evitar llamadas redundantes
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Función optimizada para procesar solo la contribución XP sin toda la cadena de gamificación
 */
export class OptimizedGamificationService {
  /**
   * Procesar contribución de manera ultra-optimizada
   * SOLO otorga XP y calcula nivel, sin quests ni streaks
   */
  static async processContributionOptimized(
    userId: string,
    amount: number
  ): Promise<{ xpEarned: number; levelUp?: boolean; newLevel?: number }> {
    try {
      logger.start(LogModule.DB, 'Procesando contribución optimizada', {
        userId,
        amount,
      });

      // Otorgar XP por contribución (la única llamada de red necesaria)
      let xpEarned = 0;
      try {
        xpEarned = await XPService.awardContributionXP(userId, amount);
      } catch (error) {
        logger.warn(
          LogModule.DB,
          'Error otorgando XP, continuando con 0',
          error
        );
        return { xpEarned: 0 };
      }

      // Cálculo de nivel en memoria (sin llamadas adicionales)
      const cacheKey = `user_xp:${userId}`;
      let previousTotalXP = 0;

      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30000) {
        // Cache de 30 seg
        previousTotalXP = cached.data;
      } else {
        try {
          previousTotalXP = await XPService.getUserTotalXP(userId);
          cache.set(cacheKey, { data: previousTotalXP, timestamp: Date.now() });
        } catch (error) {
          logger.warn(
            LogModule.DB,
            'Error obteniendo XP total, usando cache',
            error
          );
          previousTotalXP = cached?.data || 0;
        }
      }

      // Verificar level up (cálculo local)
      const actualPreviousXP = Math.max(0, previousTotalXP - xpEarned);
      const newTotalXP = actualPreviousXP + xpEarned;
      const levelCheck = LevelsService.checkLevelUp(
        actualPreviousXP,
        newTotalXP
      );

      // Actualizar cache
      cache.set(cacheKey, { data: newTotalXP, timestamp: Date.now() });

      logger.success(LogModule.DB, 'Contribución procesada optimizada', {
        xpEarned,
        levelUp: levelCheck.leveledUp,
        newLevel: levelCheck.leveledUp ? levelCheck.newLevel : undefined,
      });

      return {
        xpEarned,
        levelUp: levelCheck.leveledUp,
        newLevel: levelCheck.leveledUp ? levelCheck.newLevel : undefined,
      };
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error procesando contribución optimizada',
        error
      );
      return { xpEarned: 0 };
    }
  }

  /**
   * Invalidar cache cuando sea necesario
   */
  static invalidateCache(userId: string): void {
    cache.delete(`user_xp:${userId}`);
  }

  /**
   * Obtener stats básicas desde cache si están disponibles
   */
  static getCachedXP(userId: string): number | null {
    const cached = cache.get(`user_xp:${userId}`);
    if (cached && Date.now() - cached.timestamp < 60000) {
      // Cache de 1 min
      return cached.data;
    }
    return null;
  }
}
