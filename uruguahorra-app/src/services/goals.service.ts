import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];
type Contribution = Database['public']['Tables']['micro_contributions']['Row'];
type ContributionInsert =
  Database['public']['Tables']['micro_contributions']['Insert'];

export class GoalsService {
  /**
   * Obtener todas las metas activas del usuario
   */
  static async getUserGoals(userId: string): Promise<Goal[]> {
    try {
      logger.database(LogModule.GOALS, 'Obteniendo metas activas del usuario', {
        userId,
      });

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true) // Solo metas activas
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(LogModule.GOALS, 'Error obteniendo metas', error);
        throw error;
      }

      logger.success(
        LogModule.GOALS,
        `${data?.length || 0} metas activas obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error fatal obteniendo metas', error);
      throw error;
    }
  }

  /**
   * Obtener metas activas del usuario
   */
  static async getActiveGoals(userId: string): Promise<Goal[]> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('target_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo metas activas:', error);
      throw error;
    }
  }

  /**
   * Obtener una meta específica
   */
  static async getGoal(goalId: string): Promise<Goal | null> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo meta:', error);
      return null;
    }
  }

  /**
   * Crear nueva meta
   */
  static async createGoal(
    userId: string,
    goalData: Omit<GoalInsert, 'user_id'>
  ): Promise<Goal> {
    try {
      logger.start(LogModule.GOALS, 'Creando nueva meta', {
        userId,
        goalData,
      });

      // Verificar que tengamos un userId válido
      if (!userId || typeof userId !== 'string') {
        throw new Error('ID de usuario inválido');
      }

      logger.info(LogModule.GOALS, 'Creando meta para usuario', {
        userId,
        goalName: goalData.name,
      });

      // Crear el objeto goal con el user_id proporcionado
      const goal: GoalInsert = {
        ...goalData,
        user_id: userId,
      };

      // 3. Intentar crear la meta
      const { data, error } = await supabase
        .from('goals')
        .insert(goal)
        .select()
        .single();

      if (error) {
        // Manejo específico de errores RLS
        if (error.code === '42501') {
          logger.error(
            LogModule.DB,
            'Error RLS: Políticas de seguridad bloquearon la inserción',
            {
              code: error.code,
              message: error.message,
              userId: user.id,
              goalData: goal,
            }
          );

          // Intentar refresh de sesión y reintento
          logger.info(LogModule.AUTH, 'Intentando refresh de sesión...');
          const { error: refreshError } = await supabase.auth.refreshSession();

          if (!refreshError) {
            logger.info(
              LogModule.AUTH,
              'Sesión refrescada, reintentando creación...'
            );

            // Obtener el usuario nuevamente después del refresh
            const {
              data: { user: refreshedUser },
            } = await supabase.auth.getUser();

            if (refreshedUser) {
              const refreshedGoal = { ...goal, user_id: refreshedUser.id };
              const { data: retryData, error: retryError } = await supabase
                .from('goals')
                .insert(refreshedGoal)
                .select()
                .single();

              if (retryError) {
                logger.error(
                  LogModule.DB,
                  'Reintento fallido tras refresh de sesión',
                  retryError
                );
                throw new Error(
                  'No tienes permisos para crear metas. Verifica tu sesión.'
                );
              }

              logger.success(
                LogModule.GOALS,
                'Meta creada exitosamente tras refresh'
              );
              return retryData;
            }
          }

          throw new Error(
            'No tienes permisos para crear metas. Verifica tu sesión.'
          );
        }

        logger.error(LogModule.DB, 'Error de Supabase al crear meta', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        throw error;
      }

      logger.success(LogModule.GOALS, 'Meta creada exitosamente', {
        goalId: data.id,
        goalName: data.name,
      });
      return data;
    } catch (error: unknown) {
      logger.error(LogModule.GOALS, 'Error fatal creando meta', {
        type: error.constructor.name,
        message: error.message,
      });
      throw error;
    }
  }

  /**
   * Actualizar meta
   */
  static async updateGoal(goalId: string, updates: GoalUpdate): Promise<Goal> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando meta:', error);
      throw error;
    }
  }

  /**
   * Eliminar meta (soft delete - marcar como inactiva)
   */
  static async deleteGoal(goalId: string, userId?: string): Promise<void> {
    try {
      logger.info(LogModule.GOALS, 'Eliminando meta', { goalId, userId });

      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goalId);

      if (error) throw error;

      logger.success(LogModule.GOALS, 'Meta marcada como inactiva', { goalId });
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error eliminando meta', error);
      throw error;
    }
  }

  /**
   * Agregar contribución a una meta
   */
  static async addContribution(
    contribution: ContributionInsert
  ): Promise<Contribution> {
    try {
      logger.start(LogModule.GOALS, 'Agregando contribución', {
        amount: contribution.amount,
        goalId: contribution.goal_id,
        source: contribution.source,
      });

      // 1. Insertar la contribución
      const { data: newContribution, error: contributionError } = await supabase
        .from('micro_contributions')
        .insert(contribution)
        .select()
        .single();

      if (contributionError) {
        logger.error(
          LogModule.DB,
          'Error insertando contribución',
          contributionError
        );
        throw contributionError;
      }

      // 2. Actualizar el monto ahorrado en la meta
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('saved_amount')
        .eq('id', contribution.goal_id)
        .single();

      if (goalError) throw goalError;

      const newSavedAmount = (goal.saved_amount || 0) + contribution.amount;

      logger.sync(LogModule.GOALS, 'Actualizando monto ahorrado', {
        oldAmount: goal.saved_amount,
        newAmount: newSavedAmount,
      });

      const { error: updateError } = await supabase
        .from('goals')
        .update({ saved_amount: newSavedAmount })
        .eq('id', contribution.goal_id);

      if (updateError) {
        logger.error(
          LogModule.DB,
          'Error actualizando monto de meta',
          updateError
        );
        throw updateError;
      }

      logger.success(LogModule.GOALS, 'Contribución agregada exitosamente', {
        contributionId: newContribution.id,
        newTotal: newSavedAmount,
      });

      return newContribution;
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error agregando contribución', error);
      throw error;
    }
  }

  /**
   * Obtener contribuciones de una meta
   */
  static async getGoalContributions(goalId: string): Promise<Contribution[]> {
    try {
      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo contribuciones:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las contribuciones del usuario
   */
  static async getUserContributions(
    userId: string,
    limit = 50
  ): Promise<Contribution[]> {
    try {
      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo contribuciones del usuario:', error);
      throw error;
    }
  }

  /**
   * Calcular progreso de una meta
   */
  static calculateProgress(goal: Goal): number {
    if (goal.target_amount <= 0) return 0;
    const progress = (goal.saved_amount / goal.target_amount) * 100;
    return Math.min(progress, 100);
  }

  /**
   * Calcular días restantes para una meta
   */
  static calculateDaysRemaining(targetDate: string): number {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  }

  /**
   * Obtener estadísticas de ahorro del usuario
   */
  static async getUserSavingsStats(userId: string) {
    try {
      // Obtener total ahorrado
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('saved_amount')
        .eq('user_id', userId);

      if (goalsError) throw goalsError;

      const totalSaved =
        goals?.reduce((sum, goal) => sum + (goal.saved_amount || 0), 0) || 0;

      // Obtener contribuciones del último mes
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { data: recentContributions, error: contribError } = await supabase
        .from('micro_contributions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', lastMonth.toISOString());

      if (contribError) throw contribError;

      const monthlySaved =
        recentContributions?.reduce(
          (sum, contrib) => sum + contrib.amount,
          0
        ) || 0;

      // Obtener número de metas activas
      const { count: activeGoalsCount, error: countError } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (countError) throw countError;

      return {
        totalSaved,
        monthlySaved,
        activeGoalsCount: activeGoalsCount || 0,
        averageContribution: recentContributions?.length
          ? monthlySaved / recentContributions.length
          : 0,
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}
