// Types
export * from './types/gamification.types';
import type { StreakData, QuestProgress } from './types/gamification.types';

// Services
export { XPService } from './services/xp.service';
export { LevelsService } from './services/levels.service';
export { StreaksService } from './services/streaks.service';
export { QuestsService } from './services/quests.service';

// Utils
export * from './utils/constants';
export * from './utils/formulas';

// Components (will be added when created)
export * from './components';

// Main Gamification Service (consolidated API)
import { XPService } from './services/xp.service';
import { LevelsService } from './services/levels.service';
import { StreaksService } from './services/streaks.service';
import { QuestsService } from './services/quests.service';
import type { UserGamificationStats } from './types/gamification.types';

/**
 * Servicio principal de gamificación
 * Proporciona una API consolidada para todas las funcionalidades
 */
export class GamificationService {
  /**
   * OPTIMIZACIÓN: Obtener estadísticas básicas sin cargar quests fallidos
   */
  static async getUserBasicStats(
    userId: string,
    options: { skipQuests?: boolean } = {}
  ): Promise<UserGamificationStats> {
    try {
      const promises: [
        Promise<number>,
        Promise<StreakData | null>,
        Promise<QuestProgress[]>?,
      ] = [
        XPService.getUserTotalXP(userId),
        StreaksService.getUserStreak(userId),
      ];

      // Solo agregar quests si no se solicita skipear
      if (!options.skipQuests) {
        promises.push(QuestsService.getUserActiveQuests(userId));
      }

      const results = await Promise.allSettled(promises);
      const [totalXPResult, streakResult, questsResult] = results;

      // Manejar resultados con valores por defecto para errores
      const finalTotalXP =
        totalXPResult.status === 'fulfilled' ? totalXPResult.value : 0;
      const finalStreak =
        streakResult.status === 'fulfilled' && streakResult.value
          ? streakResult.value
          : {
              id: '',
              user_id: userId,
              current_streak: 0,
              longest_streak: 0,
              last_activity_at: new Date().toISOString(),
              streak_protections_used: 0,
              protection_reset_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
      const finalActiveQuests =
        options.skipQuests ||
        !questsResult ||
        questsResult.status !== 'fulfilled'
          ? []
          : questsResult.value;

      const level = LevelsService.getLevel(finalTotalXP);
      const levelInfo = LevelsService.getLevelProgress(finalTotalXP);

      return {
        totalXP: finalTotalXP,
        level,
        levelInfo,
        streak: finalStreak,
        activeQuests: finalActiveQuests || [],
      };
    } catch (error) {
      // Si todo falla, retornar valores por defecto
      return {
        totalXP: 0,
        level: 1,
        levelInfo: { level: 1, progress: 0, nextLevelXP: 4, currentLevelXP: 0 },
        streak: {
          id: '',
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_activity_at: new Date().toISOString(),
          streak_protections_used: 0,
          protection_reset_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        activeQuests: [],
      };
    }
  }

  /**
   * OPTIMIZACIÓN: Procesar solo contribución SIN evaluar quests fallidos
   * Incluye bonus de squad si el usuario pertenece a alguno
   */
  static async processContributionEvent(
    userId: string,
    amount: number
  ): Promise<{
    xpEarned: number;
    levelUp?: boolean;
    newLevel?: number;
  }> {
    try {
      // Solo otorgar XP por contribución con bonus de squad
      let xpEarned = 0;
      try {
        const baseXp = await XPService.awardContributionXP(userId, amount);

        // Aplicar bonus de squad si es aplicable
        const { SquadGamificationService } = await import(
          '@/services/squad-gamification.service'
        );
        xpEarned = await SquadGamificationService.calculateSquadBonusXp(
          baseXp,
          userId
        );

        // Registrar evento XP de squad si hay bonus
        if (xpEarned > baseXp) {
          await SquadGamificationService.logSquadXpEvent(
            userId,
            'contribution_bonus',
            xpEarned - baseXp,
            undefined,
            { amount, baseXp, bonusXp: xpEarned - baseXp }
          );
        }
      } catch (error) {
        console.warn('Error awarding XP, continuing with 0 XP:', error);
        xpEarned = 0;
      }

      // Verificar subida de nivel simple
      let levelCheck = { leveledUp: false, newLevel: 1 };
      try {
        const previousTotalXP =
          (await XPService.getUserTotalXP(userId)) - xpEarned;
        levelCheck = LevelsService.checkLevelUp(
          previousTotalXP,
          previousTotalXP + xpEarned
        );
      } catch (error) {
        console.warn(
          'Error checking level up, continuing without level up:',
          error
        );
      }

      return {
        xpEarned,
        levelUp: levelCheck.leveledUp,
        newLevel: levelCheck.leveledUp ? levelCheck.newLevel : undefined,
      };
    } catch (error) {
      console.warn(
        'Contribution event processing failed, returning safe defaults:',
        error
      );
      return {
        xpEarned: 0,
        levelUp: false,
      };
    }
  }
  static async getUserStats(userId: string): Promise<UserGamificationStats> {
    try {
      const [totalXP, streak, activeQuests] = await Promise.allSettled([
        XPService.getUserTotalXP(userId),
        StreaksService.getUserStreak(userId),
        QuestsService.getUserActiveQuests(userId),
      ]);

      // Manejar resultados con valores por defecto para errores
      const finalTotalXP = totalXP.status === 'fulfilled' ? totalXP.value : 0;
      const finalStreak =
        streak.status === 'fulfilled' && streak.value
          ? streak.value
          : {
              id: '',
              user_id: userId,
              current_streak: 0,
              longest_streak: 0,
              last_activity_at: new Date().toISOString(),
              streak_protections_used: 0,
              protection_reset_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
      const finalActiveQuests =
        activeQuests.status === 'fulfilled' ? activeQuests.value : [];

      const level = LevelsService.getLevel(finalTotalXP);
      const levelInfo = LevelsService.getLevelProgress(finalTotalXP);

      return {
        totalXP: finalTotalXP,
        level,
        levelInfo,
        streak: finalStreak,
        activeQuests: finalActiveQuests || [],
      };
    } catch (error) {
      // Si todo falla, retornar valores por defecto
      return {
        totalXP: 0,
        level: 1,
        levelInfo: { level: 1, progress: 0, nextLevelXP: 4, currentLevelXP: 0 },
        streak: {
          id: '',
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_activity_at: new Date().toISOString(),
          streak_protections_used: 0,
          protection_reset_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        activeQuests: [],
      };
    }
  }

  /**
   * Procesar evento de gamificación (contribución, challenge, etc.)
   */
  static async processGamificationEvent(
    userId: string,
    eventType: 'contribution' | 'challenge_complete',
    eventData: { amount?: number; challengeId?: string }
  ): Promise<{
    xpEarned: number;
    levelUp?: boolean;
    newLevel?: number;
    streakUpdated: boolean;
    questsProgressed: boolean;
  }> {
    try {
      // 1. Otorgar XP (con manejo resiliente)
      let xpEarned = 0;
      try {
        if (eventType === 'contribution' && eventData.amount) {
          xpEarned = await XPService.awardContributionXP(
            userId,
            eventData.amount
          );
        } else if (
          eventType === 'challenge_complete' &&
          eventData.challengeId
        ) {
          xpEarned = await XPService.awardChallengeXP(
            userId,
            eventData.challengeId
          );
        }
      } catch (error) {
        // Si el XP falla, continuamos con valor 0
        console.warn('Error awarding XP, continuing with 0 XP:', error);
        xpEarned = 0;
      }

      // 2. Verificar subida de nivel (con manejo resiliente)
      let levelCheck = { leveledUp: false, newLevel: 1 };
      try {
        const previousTotalXP =
          (await XPService.getUserTotalXP(userId)) - xpEarned;
        levelCheck = LevelsService.checkLevelUp(
          previousTotalXP,
          previousTotalXP + xpEarned
        );
      } catch (error) {
        // Si level check falla, asumir que no hay level up
        console.warn(
          'Error checking level up, continuing without level up:',
          error
        );
      }

      // 3. Actualizar racha (con manejo resiliente)
      let streakUpdated = false;
      try {
        await StreaksService.updateStreak(userId);
        streakUpdated = true;
      } catch (error) {
        // Si streak update falla, continuamos
        console.warn(
          'Error updating streak, continuing without streak update:',
          error
        );
      }

      // 4. Evaluar progreso de quests (con manejo resiliente)
      let questProgress: QuestProgress[] = [];
      try {
        questProgress = await QuestsService.evaluateQuestCompletion(userId);
      } catch (error) {
        // Si quest evaluation falla, continuamos
        console.warn(
          'Error evaluating quests, continuing without quest progress:',
          error
        );
      }

      return {
        xpEarned,
        levelUp: levelCheck.leveledUp,
        newLevel: levelCheck.leveledUp ? levelCheck.newLevel : undefined,
        streakUpdated,
        questsProgressed: questProgress.length > 0,
      };
    } catch (error) {
      // Si todo falla, retornar valores seguros que no rompan la UI
      console.warn(
        'Gamification event processing failed completely, returning safe defaults:',
        error
      );
      return {
        xpEarned: 0,
        levelUp: false,
        streakUpdated: false,
        questsProgressed: false,
      };
    }
  }

  // Re-export individual services for granular access
  static XP = XPService;
  static Levels = LevelsService;
  static Streaks = StreaksService;
  static Quests = QuestsService;
}
