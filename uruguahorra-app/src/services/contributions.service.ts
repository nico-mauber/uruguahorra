import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { XPService, StreaksService } from '@/features/gamification';

type Contribution = Database['public']['Tables']['micro_contributions']['Row'];
type ContributionInsert =
  Database['public']['Tables']['micro_contributions']['Insert'];
type ContributionUpdate =
  Database['public']['Tables']['micro_contributions']['Update'];

export class ContributionsService {
  /**
   * Crear nueva contribución
   */
  static async createContribution(
    contribution: ContributionInsert
  ): Promise<Contribution> {
    try {
      logger.start(LogModule.DB, 'Creando nueva contribución', {
        amount: contribution.amount,
        goalId: contribution.goal_id,
        source: contribution.source,
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .insert(contribution)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error creando contribución', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Contribución creada exitosamente', {
        contributionId: data.id,
        amount: data.amount,
      });

      // Procesar gamificación en paralelo (sin bloquear la respuesta)
      this.processGamificationAsync(data.user_id, data.amount).catch((error) => {
        logger.error(LogModule.DB, 'Error procesando gamificación', error);
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal creando contribución', error);
      throw error;
    }
  }

  /**
   * Obtener contribuciones de un usuario
   */
  static async getUserContributions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Contribution[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contribuciones del usuario', {
        userId,
        limit,
        offset,
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo contribuciones', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contribuciones obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contribuciones',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contribuciones de una meta específica
   */
  static async getGoalContributions(goalId: string): Promise<Contribution[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contribuciones de meta', {
        goalId,
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones de meta',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contribuciones de meta obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contribuciones de meta',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener estadísticas de contribuciones del usuario
   */
  static async getUserContributionStats(userId: string) {
    try {
      logger.database(
        LogModule.DB,
        'Obteniendo estadísticas de contribuciones',
        { userId }
      );

      // Obtener contribuciones del último mes
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { data, error } = await supabase
        .from('micro_contributions')
        .select('amount, source, created_at')
        .eq('user_id', userId)
        .gte('created_at', lastMonth.toISOString());

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo estadísticas', error);
        throw error;
      }

      const contributions = data || [];

      // Calcular estadísticas
      const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
      const avgContribution =
        contributions.length > 0 ? totalAmount / contributions.length : 0;

      // Agrupar por fuente
      const bySource = contributions.reduce(
        (acc, c) => {
          acc[c.source] = (acc[c.source] || 0) + c.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      // Agrupar por día para streak
      const byDay = contributions.reduce(
        (acc, c) => {
          const day = c.created_at.split('T')[0];
          if (!acc[day]) {
            acc[day] = 0;
          }
          acc[day] += c.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      const stats = {
        totalContributions: contributions.length,
        totalAmount,
        averageContribution: avgContribution,
        bySource,
        daysSaved: Object.keys(byDay).length,
        lastContribution:
          contributions.length > 0 ? contributions[0].created_at : null,
      };

      logger.success(LogModule.DB, 'Estadísticas calculadas', stats);
      return stats;
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculando estadísticas', error);
      throw error;
    }
  }

  /**
   * Obtener contribuciones recientes del usuario
   */
  static async getRecentContributions(
    userId: string,
    days: number = 7
  ): Promise<Contribution[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      logger.database(LogModule.DB, 'Obteniendo contribuciones recientes', {
        userId,
        days,
        startDate: startDate.toISOString(),
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones recientes',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contribuciones recientes obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contribuciones recientes',
        error
      );
      throw error;
    }
  }

  /**
   * Actualizar contribución
   */
  static async updateContribution(
    contributionId: string,
    updates: ContributionUpdate
  ): Promise<Contribution> {
    try {
      logger.info(LogModule.DB, 'Actualizando contribución', {
        contributionId,
        updates,
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .update(updates)
        .eq('id', contributionId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando contribución', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Contribución actualizada exitosamente');
      return data;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal actualizando contribución',
        error
      );
      throw error;
    }
  }

  /**
   * Eliminar contribución
   */
  static async deleteContribution(contributionId: string): Promise<void> {
    try {
      logger.warn(LogModule.DB, 'Eliminando contribución', { contributionId });

      const { error } = await supabase
        .from('micro_contributions')
        .delete()
        .eq('id', contributionId);

      if (error) {
        logger.error(LogModule.DB, 'Error eliminando contribución', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Contribución eliminada exitosamente');
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal eliminando contribución', error);
      throw error;
    }
  }

  /**
   * Obtener total ahorrado por usuario
   */
  static async getTotalSaved(userId: string): Promise<number> {
    try {
      logger.database(LogModule.DB, 'Calculando total ahorrado', { userId });

      const { data, error } = await supabase
        .from('micro_contributions')
        .select('amount')
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error calculando total ahorrado', error);
        throw error;
      }

      const total = (data || []).reduce((sum, c) => sum + c.amount, 0);

      logger.success(LogModule.DB, 'Total ahorrado calculado', { total });
      return total;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal calculando total ahorrado',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contribuciones por período
   */
  static async getContributionsByPeriod(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Contribution[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contribuciones por período', {
        userId,
        startDate,
        endDate,
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones por período',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contribuciones del período obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contribuciones por período',
        error
      );
      throw error;
    }
  }

  /**
   * Crear múltiples contribuciones (importar desde CSV)
   */
  static async createBulkContributions(
    contributions: ContributionInsert[]
  ): Promise<Contribution[]> {
    try {
      logger.start(LogModule.DB, 'Creando contribuciones en lote', {
        count: contributions.length,
      });

      const { data, error } = await supabase
        .from('micro_contributions')
        .insert(contributions)
        .select();

      if (error) {
        logger.error(
          LogModule.DB,
          'Error creando contribuciones en lote',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contribuciones creadas en lote`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal creando contribuciones en lote',
        error
      );
      throw error;
    }
  }

  /**
   * Procesar gamificación de forma asíncrona para contribuciones
   */
  private static async processGamificationAsync(
    userId: string, 
    amount: number
  ): Promise<void> {
    try {
      logger.info(LogModule.DB, 'Procesando gamificación para contribución', {
        userId,
        amount,
      });

      // Otorgar XP por contribución
      const xpEarned = await XPService.awardContributionXP(userId, amount);
      
      // Actualizar racha del usuario
      await StreaksService.updateStreak(userId);

      logger.success(LogModule.DB, 'Gamificación procesada exitosamente', {
        xpEarned,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error en procesamiento de gamificación', error);
      // No re-lanzar el error para evitar afectar la operación principal
    }
  }
}
