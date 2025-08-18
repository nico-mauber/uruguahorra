import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { XPService, StreaksService, QuestsService } from '@/features/gamification';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type UserChallenge = Database['public']['Tables']['user_challenges']['Row'];
type UserChallengeInsert =
  Database['public']['Tables']['user_challenges']['Insert'];
type UserChallengeUpdate =
  Database['public']['Tables']['user_challenges']['Update'];

export class ChallengesService {
  /**
   * Obtener todos los desafíos activos
   */
  static async getActiveChallenges(): Promise<Challenge[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo desafíos activos');

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('type', { ascending: true });

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo desafíos activos', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} desafíos activos obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo desafíos activos',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener desafíos del usuario con su progreso
   */
  static async getUserChallenges(
    userId: string
  ): Promise<(UserChallenge & { challenge: Challenge })[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo desafíos del usuario', {
        userId,
      });

      const { data, error } = await supabase
        .from('user_challenges')
        .select(
          `
          *,
          challenge:challenges(*)
        `
        )
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo desafíos del usuario',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} desafíos del usuario obtenidos`
      );
      return (data as any) || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo desafíos del usuario',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener desafíos disponibles para el usuario (no iniciados)
   */
  static async getAvailableChallenges(userId: string): Promise<Challenge[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo desafíos disponibles', {
        userId,
      });

      // Obtener IDs de desafíos ya iniciados por el usuario
      const { data: userChallengeIds, error: userError } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('user_id', userId);

      if (userError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo desafíos del usuario',
          userError
        );
        throw userError;
      }

      const startedChallengeIds = (userChallengeIds || []).map(
        (uc) => uc.challenge_id
      );

      // Obtener desafíos activos no iniciados
      let query = supabase.from('challenges').select('*').eq('active', true);

      if (startedChallengeIds.length > 0) {
        query = query.not('id', 'in', `(${startedChallengeIds.join(',')})`);
      }

      const { data, error } = await query.order('points', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo desafíos disponibles',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} desafíos disponibles obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo desafíos disponibles',
        error
      );
      throw error;
    }
  }

  /**
   * Iniciar un desafío para el usuario
   */
  static async startChallenge(
    userId: string,
    challengeId: string
  ): Promise<UserChallenge> {
    try {
      logger.start(LogModule.DB, 'Iniciando desafío para usuario', {
        userId,
        challengeId,
      });

      const userChallenge: UserChallengeInsert = {
        user_id: userId,
        challenge_id: challengeId,
        status: 'in_progress',
        progress: 0,
        started_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_challenges')
        .insert(userChallenge)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error iniciando desafío', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Desafío iniciado exitosamente', {
        userChallengeId: data.id,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal iniciando desafío', error);
      throw error;
    }
  }

  /**
   * Actualizar progreso del desafío
   */
  static async updateChallengeProgress(
    userChallengeId: string,
    progress: number
  ): Promise<UserChallenge> {
    try {
      logger.info(LogModule.DB, 'Actualizando progreso de desafío', {
        userChallengeId,
        progress,
      });

      const updates: UserChallengeUpdate = {
        progress,
        updated_at: new Date().toISOString(),
      };

      // Si el progreso es 100%, marcar como completado
      if (progress >= 100) {
        updates.status = 'done';
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('user_challenges')
        .update(updates)
        .eq('id', userChallengeId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando progreso', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Progreso actualizado exitosamente', {
        progress,
        status: data.status,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal actualizando progreso', error);
      throw error;
    }
  }

  /**
   * Completar desafío y reclamar recompensa
   */
  static async completeChallenge(
    userChallengeId: string
  ): Promise<UserChallenge> {
    try {
      logger.start(LogModule.DB, 'Completando desafío', { userChallengeId });

      const { data, error } = await supabase
        .from('user_challenges')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', userChallengeId)
        .eq('status', 'done')
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error completando desafío', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Desafío completado y recompensa reclamada');
      
      // Procesar gamificación en paralelo
      this.processChallengeGamificationAsync(data.user_id, data.challenge_id).catch((error) => {
        logger.error(LogModule.DB, 'Error procesando gamificación de challenge', error);
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal completando desafío', error);
      throw error;
    }
  }

  /**
   * Obtener desafíos completados pendientes de reclamar
   */
  static async getPendingRewards(
    userId: string
  ): Promise<(UserChallenge & { challenge: Challenge })[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo recompensas pendientes', {
        userId,
      });

      const { data, error } = await supabase
        .from('user_challenges')
        .select(
          `
          *,
          challenge:challenges(*)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'done')
        .order('completed_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo recompensas pendientes',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} recompensas pendientes obtenidas`
      );
      return (data as any) || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo recompensas pendientes',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener estadísticas de desafíos del usuario
   */
  static async getUserChallengeStats(userId: string) {
    try {
      logger.database(LogModule.DB, 'Calculando estadísticas de desafíos', {
        userId,
      });

      const { data, error } = await supabase
        .from('user_challenges')
        .select(
          `
          *,
          challenge:challenges(points, type)
        `
        )
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error calculando estadísticas', error);
        throw error;
      }

      const challenges = (data as any) || [];

      // Calcular estadísticas
      const totalChallenges = challenges.length;
      const completedChallenges = challenges.filter(
        (c: any) => c.status === 'done' || c.status === 'claimed'
      ).length;
      const claimedChallenges = challenges.filter(
        (c: any) => c.status === 'claimed'
      ).length;
      const inProgressChallenges = challenges.filter(
        (c: any) => c.status === 'in_progress'
      ).length;

      const totalPointsEarned = challenges
        .filter((c: any) => c.status === 'claimed')
        .reduce((sum: number, c: any) => sum + (c.challenge?.points || 0), 0);

      const totalPointsPending = challenges
        .filter((c: any) => c.status === 'done')
        .reduce((sum: number, c: any) => sum + (c.challenge?.points || 0), 0);

      // Agrupar por tipo de desafío
      const byType = challenges.reduce((acc: any, c: any) => {
        const type = c.challenge?.type || 'unknown';
        if (!acc[type]) {
          acc[type] = { total: 0, completed: 0 };
        }
        acc[type].total++;
        if (c.status === 'done' || c.status === 'claimed') {
          acc[type].completed++;
        }
        return acc;
      }, {});

      const stats = {
        totalChallenges,
        completedChallenges,
        claimedChallenges,
        inProgressChallenges,
        totalPointsEarned,
        totalPointsPending,
        completionRate:
          totalChallenges > 0
            ? (completedChallenges / totalChallenges) * 100
            : 0,
        byType,
      };

      logger.success(
        LogModule.DB,
        'Estadísticas de desafíos calculadas',
        stats
      );
      return stats;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error calculando estadísticas de desafíos',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener desafíos por tipo
   */
  static async getChallengesByType(
    type: 'daily' | 'weekly' | 'monthly' | 'achievement'
  ): Promise<Challenge[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo desafíos por tipo', { type });

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('type', type)
        .eq('active', true)
        .order('points', { ascending: false });

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo desafíos por tipo', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} desafíos de tipo ${type} obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo desafíos por tipo',
        error
      );
      throw error;
    }
  }

  /**
   * Verificar automáticamente el progreso de desafíos basados en ahorro
   */
  static async checkSavingsChallenges(
    userId: string,
    newContributionAmount: number
  ) {
    try {
      logger.info(LogModule.DB, 'Verificando progreso de desafíos de ahorro', {
        userId,
        newContributionAmount,
      });

      // Obtener desafíos de ahorro en progreso
      const { data: userChallenges, error } = await supabase
        .from('user_challenges')
        .select(
          `
          *,
          challenge:challenges(*)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .eq('challenge.requirement_type', 'savings');

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo desafíos de ahorro',
          error
        );
        return;
      }

      const challenges = (userChallenges as any) || [];

      for (const userChallenge of challenges) {
        const challenge = userChallenge.challenge;
        const requiredAmount = challenge.requirement_value || 0;

        // Calcular total ahorrado por el usuario
        const { data: contributions } = await supabase
          .from('micro_contributions')
          .select('amount')
          .eq('user_id', userId);

        const totalSaved = (contributions || []).reduce(
          (sum, c) => sum + c.amount,
          0
        );
        const progress = Math.min((totalSaved / requiredAmount) * 100, 100);

        if (progress > userChallenge.progress) {
          await this.updateChallengeProgress(userChallenge.id, progress);
          logger.info(
            LogModule.DB,
            'Progreso de desafío actualizado automáticamente',
            {
              challengeId: challenge.id,
              oldProgress: userChallenge.progress,
              newProgress: progress,
            }
          );
        }
      }
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando desafíos de ahorro', error);
    }
  }

  /**
   * Verificar desafíos de racha (streak)
   */
  static async checkStreakChallenges(userId: string, currentStreak: number) {
    try {
      logger.info(LogModule.DB, 'Verificando progreso de desafíos de racha', {
        userId,
        currentStreak,
      });

      // Obtener desafíos de racha en progreso
      const { data: userChallenges, error } = await supabase
        .from('user_challenges')
        .select(
          `
          *,
          challenge:challenges(*)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .eq('challenge.requirement_type', 'streak');

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo desafíos de racha', error);
        return;
      }

      const challenges = (userChallenges as any) || [];

      for (const userChallenge of challenges) {
        const challenge = userChallenge.challenge;
        const requiredStreak = challenge.requirement_value || 0;
        const progress = Math.min((currentStreak / requiredStreak) * 100, 100);

        if (progress > userChallenge.progress) {
          await this.updateChallengeProgress(userChallenge.id, progress);
          logger.info(
            LogModule.DB,
            'Progreso de desafío de racha actualizado',
            {
              challengeId: challenge.id,
              currentStreak,
              requiredStreak,
              progress,
            }
          );
        }
      }
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando desafíos de racha', error);
    }
  }

  /**
   * Procesar gamificación de forma asíncrona para challenges completados
   */
  private static async processChallengeGamificationAsync(
    userId: string, 
    challengeId: string
  ): Promise<void> {
    try {
      logger.info(LogModule.DB, 'Procesando gamificación para challenge', {
        userId,
        challengeId,
      });

      // Otorgar XP por completar challenge
      const xpEarned = await XPService.awardChallengeXP(userId, challengeId);
      
      // Actualizar racha del usuario
      await StreaksService.updateStreak(userId);
      
      // Evaluar progreso de quests
      await QuestsService.evaluateQuestCompletion(userId);

      logger.success(LogModule.DB, 'Gamificación de challenge procesada exitosamente', {
        xpEarned,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error en procesamiento de gamificación de challenge', error);
      // No re-lanzar el error para evitar afectar la operación principal
    }
  }
}
