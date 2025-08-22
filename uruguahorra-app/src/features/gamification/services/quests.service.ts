import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import type { WeeklyQuest, QuestProgress } from '../types/gamification.types';
import {
  calculateQuestProgress,
  isQuestCompleted,
  getWeekStartDate,
} from '../utils/formulas';
import { QUEST_SETTINGS } from '../utils/constants';
import { XPService } from './xp.service';
import { QuestInitializationService } from './quest-initialization.service';
// import { callThrottler } from '@/lib/throttle'; // TODO: Use when throttling is needed

export class QuestsService {
  /**
   * Evaluar y actualizar progreso de quests del usuario
   */
  static async evaluateQuestCompletion(
    userId: string
  ): Promise<QuestProgress[]> {
    try {
      logger.start(LogModule.DB, 'Evaluando progreso de quests', { userId });

      // SOLUCIÓN DE RAÍZ: Inicializar sistema de quests antes de usarlo
      const questSystemReady = await QuestInitializationService.initialize();
      if (!questSystemReady) {
        logger.warn(
          LogModule.DB,
          'Sistema de quests no disponible, retornando array vacío'
        );
        return [];
      }

      // Obtener quests activos del usuario
      const activeQuests = await this.getUserActiveQuests(userId);
      const updatedQuests: QuestProgress[] = [];

      for (const questProgress of activeQuests) {
        if (questProgress.completed_at) {
          // Ya completado, omitir
          updatedQuests.push(questProgress);
          continue;
        }

        const updated = await this.updateQuestProgress(userId, questProgress);
        updatedQuests.push(updated);

        // Si se completó en esta evaluación, otorgar XP bonus
        if (updated.completed_at && !questProgress.completed_at) {
          await XPService.awardXP(userId, 'quest_complete', {
            questId: updated.quest_id,
            bonusXP: QUEST_SETTINGS.QUEST_XP_BONUS,
          });

          logger.success(LogModule.DB, 'Quest completado', {
            userId,
            questId: updated.quest_id,
            bonusXP: QUEST_SETTINGS.QUEST_XP_BONUS,
          });
        }
      }

      return updatedQuests;
    } catch (error) {
      logger.error(LogModule.DB, 'Error evaluando quests', error);
      throw error; // REVERTIDO: Propagar error, el sistema debe funcionar correctamente
    }
  }

  /**
   * Generar nueva quest semanal
   */
  static async generateWeeklyQuest(): Promise<WeeklyQuest> {
    try {
      logger.start(LogModule.DB, 'Generando quest semanal');

      // SOLUCIÓN DE RAÍZ: Usar el servicio de inicialización
      const questSystemReady = await QuestInitializationService.initialize();
      if (!questSystemReady) {
        throw new Error('Sistema de quests no inicializado correctamente');
      }

      const weekStartDate = getWeekStartDate();

      // Verificar si ya existe quest para esta semana
      const { data: existingQuest, error: existingError } = await supabase
        .from('weekly_quests')
        .select('*')
        .eq('week_start_date', weekStartDate.toISOString().split('T')[0])
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingQuest) {
        logger.info(LogModule.DB, 'Quest semanal ya existe', {
          questId: existingQuest.id,
        });
        return existingQuest;
      }

      // Obtener challenges activos aleatorios
      const challengeIds = await this.selectRandomChallenges();

      const { data: newQuest, error: createError } = await supabase
        .from('weekly_quests')
        .insert({
          week_start_date: weekStartDate.toISOString().split('T')[0],
          challenge_ids: challengeIds,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      logger.success(LogModule.DB, 'Quest semanal creada', {
        questId: newQuest.id,
        challengeCount: challengeIds.length,
      });

      return newQuest;
    } catch (error) {
      logger.error(LogModule.DB, 'Error generando quest semanal', error);
      throw error; // REVERTIDO: Propagar error, el sistema debe funcionar
    }
  }

  /**
   * Obtener quests activos del usuario con progreso
   */
  static async getUserActiveQuests(userId: string): Promise<QuestProgress[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo quests activos del usuario', {
        userId,
      });

      // SOLUCIÓN DE RAÍZ: Inicializar sistema antes de usar
      const questSystemReady = await QuestInitializationService.initialize();
      if (!questSystemReady) {
        logger.warn(LogModule.DB, 'Sistema de quests no disponible');
        return [];
      }

      // Asegurar que exista quest para semana actual
      await this.generateWeeklyQuest();

      const { data, error } = await supabase
        .from('user_quest_progress')
        .select(
          `
          *,
          quest:weekly_quests(*)
        `
        )
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const quests: QuestProgress[] = data || [];

      // Ordenar por fecha de inicio de la quest (más reciente primero)
      quests.sort((a: QuestProgress, b: QuestProgress) => {
        const dateA = a.quest?.week_start_date || '';
        const dateB = b.quest?.week_start_date || '';
        return dateB.localeCompare(dateA);
      });

      // Filtrar solo quests de semana actual y anteriores (últimas 4 semanas)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const activeQuests = quests.filter((q: QuestProgress) => {
        if (!q.quest) return false;
        const questDate = new Date(q.quest.week_start_date);
        return questDate >= fourWeeksAgo;
      });

      // Crear progreso para quest actual si no existe (usando función segura)
      const currentWeekQuest = await this.getCurrentWeekQuest();
      const hasCurrentWeekProgress = activeQuests.some(
        (q: QuestProgress) => q.quest_id === currentWeekQuest.id
      );

      if (!hasCurrentWeekProgress) {
        // SOLUCIÓN DE RAÍZ: Usar función segura que maneja duplicados automáticamente
        // En lugar de verificar existencia, dejar que la función maneje el caso
        try {
          const newProgress = await this.createQuestProgress(
            userId,
            currentWeekQuest.id
          );
          activeQuests.unshift(newProgress);
        } catch (error: any) {
          // Si el error es de duplicate key, significa que otro proceso ya lo creó
          // En este caso, refrescar la lista
          if (error?.code === '23505') {
            logger.info(
              LogModule.DB,
              'Quest progress ya existe, refrescando lista'
            );
            return this.getUserActiveQuests(userId);
          }
          throw error;
        }
      }

      logger.success(
        LogModule.DB,
        `${activeQuests.length} quests activos obtenidos`
      );
      return activeQuests;
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo quests activos', error);
      throw error; // REVERTIDO: Propagar error, el sistema debe funcionar
    }
  }

  /**
   * Marcar quest como completado
   */
  static async completeQuest(userId: string, questId: string): Promise<void> {
    try {
      logger.info(LogModule.DB, 'Marcando quest como completado', {
        userId,
        questId,
      });

      const { error } = await supabase
        .from('user_quest_progress')
        .update({
          completion_percentage: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('quest_id', questId);

      if (error) {
        logger.error(LogModule.DB, 'Error marcando quest completado', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        'Quest marcado como completado exitosamente'
      );
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal completando quest', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas globales de quests
   */
  static async getGlobalQuestStats(): Promise<{
    totalQuests: number;
    completedQuests: number;
    completionRate: number;
    averageProgress: number;
  }> {
    try {
      logger.database(
        LogModule.DB,
        'Obteniendo estadísticas globales de quests'
      );

      const { data, error } = await supabase
        .from('user_quest_progress')
        .select('completion_percentage, completed_at');

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo estadísticas de quests',
          error
        );
        throw error;
      }

      const progresses = data || [];
      const totalQuests = progresses.length;
      const completedQuests = progresses.filter(
        (p) => p.completed_at !== null
      ).length;
      const completionRate =
        totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;
      const averageProgress =
        totalQuests > 0
          ? progresses.reduce((sum, p) => sum + p.completion_percentage, 0) /
            totalQuests
          : 0;

      const stats = {
        totalQuests,
        completedQuests,
        completionRate: Math.round(completionRate * 10) / 10,
        averageProgress: Math.round(averageProgress * 10) / 10,
      };

      logger.success(
        LogModule.DB,
        'Estadísticas globales de quests calculadas',
        stats
      );
      return stats;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error calculando estadísticas globales',
        error
      );
      throw error;
    }
  }

  // Métodos privados auxiliares

  /**
   * Actualizar progreso individual de una quest
   */
  private static async updateQuestProgress(
    userId: string,
    questProgress: QuestProgress
  ): Promise<QuestProgress> {
    try {
      // Obtener challenges completados por el usuario que pertenecen a esta quest
      const { data: userChallenges, error: challengesError } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('user_id', userId)
        .eq('status', 'claimed')
        .in('challenge_id', questProgress.quest?.challenge_ids || []);

      if (challengesError) {
        throw challengesError;
      }

      const completedChallengeIds = (userChallenges || []).map(
        (uc) => uc.challenge_id
      );
      const totalChallengeIds = questProgress.quest?.challenge_ids || [];

      const newCompletionPercentage = calculateQuestProgress(
        completedChallengeIds,
        totalChallengeIds
      );
      const isCompleted = isQuestCompleted(
        completedChallengeIds,
        totalChallengeIds
      );

      // Actualizar solo si cambió el progreso
      if (
        newCompletionPercentage !== questProgress.completion_percentage ||
        (isCompleted && !questProgress.completed_at)
      ) {
        const updates: Partial<QuestProgress> = {
          completed_challenge_ids: completedChallengeIds,
          completion_percentage: newCompletionPercentage,
        };

        if (isCompleted && !questProgress.completed_at) {
          updates.completed_at = new Date().toISOString();
        }

        const { data: updated, error: updateError } = await supabase
          .from('user_quest_progress')
          .update(updates)
          .eq('id', questProgress.id)
          .select(
            `
            *,
            quest:weekly_quests(*)
          `
          )
          .single();

        if (updateError) {
          throw updateError;
        }

        return updated as QuestProgress;
      }

      return questProgress;
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando progreso de quest', error);
      throw error;
    }
  }

  /**
   * Seleccionar challenges aleatorios para quest semanal
   */
  private static async selectRandomChallenges(): Promise<string[]> {
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('id, type')
      .eq('is_active', true)
      .in('type', ['daily', 'weekly']); // Solo challenges diarios y semanales

    if (error) {
      throw error;
    }

    const availableChallenges = challenges || [];

    if (availableChallenges.length < QUEST_SETTINGS.CHALLENGES_PER_QUEST) {
      logger.warn(LogModule.DB, 'Pocos challenges disponibles para quest', {
        available: availableChallenges.length,
        needed: QUEST_SETTINGS.CHALLENGES_PER_QUEST,
      });
    }

    // Seleccionar challenges aleatorios
    const shuffled = availableChallenges.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, QUEST_SETTINGS.CHALLENGES_PER_QUEST);

    return selected.map((c) => c.id);
  }

  /**
   * Obtener quest de la semana actual
   */
  private static async getCurrentWeekQuest(): Promise<WeeklyQuest> {
    const weekStartDate = getWeekStartDate();

    const { data, error } = await supabase
      .from('weekly_quests')
      .select('*')
      .eq('week_start_date', weekStartDate.toISOString().split('T')[0])
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(); // Usar maybeSingle() en lugar de single()

    // Si hay error que no sea PGRST116 (no results), lanzarlo
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Si no hay datos, generar quest para esta semana
    if (!data) {
      return await this.generateWeeklyQuest();
    }

    return data;
  }

  /**
   * Crear progreso inicial para una quest usando función segura
   */
  private static async createQuestProgress(
    userId: string,
    questId: string
  ): Promise<QuestProgress> {
    // Usar la función segura para evitar conflictos 409
    const { data: progressId, error: rpcError } = await supabase.rpc(
      'create_user_quest_progress_safe',
      {
        p_user_id: userId,
        p_quest_id: questId,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    // Obtener el progreso completo
    const { data, error } = await supabase
      .from('user_quest_progress')
      .select(
        `
        *,
        quest:weekly_quests(*)
      `
      )
      .eq('id', progressId)
      .single();

    if (error) {
      throw error;
    }

    return data as QuestProgress;
  }
}
