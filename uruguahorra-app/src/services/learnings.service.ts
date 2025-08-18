import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type Learning = Database['public']['Tables']['learnings']['Row'];
type UserProgress = Database['public']['Tables']['user_progress']['Row'];
type UserProgressInsert =
  Database['public']['Tables']['user_progress']['Insert'];
type UserProgressUpdate =
  Database['public']['Tables']['user_progress']['Update'];

export class LearningsService {
  /**
   * Obtener todos los contenidos educativos activos
   */
  static async getAllLearnings(): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contenidos educativos');

      const { data, error } = await supabase
        .from('learnings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contenidos educativos',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contenidos educativos obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contenidos educativos',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contenidos por categoría
   */
  static async getLearningsByCategory(
    category:
      | 'budgeting'
      | 'saving'
      | 'investing'
      | 'debt'
      | 'financial_planning'
      | 'economics'
  ): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contenidos por categoría', {
        category,
      });

      const { data, error } = await supabase
        .from('learnings')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('difficulty', { ascending: true });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contenidos por categoría',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contenidos de ${category} obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contenidos por categoría',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contenidos por dificultad
   */
  static async getLearningsByDifficulty(
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contenidos por dificultad', {
        difficulty,
      });

      const { data, error } = await supabase
        .from('learnings')
        .select('*')
        .eq('difficulty', difficulty)
        .eq('is_active', true)
        .order('points', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contenidos por dificultad',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contenidos de nivel ${difficulty} obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contenidos por dificultad',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener progreso de aprendizaje del usuario
   */
  static async getUserProgress(
    userId: string
  ): Promise<(UserProgress & { learning: Learning })[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo progreso de usuario', {
        userId,
      });

      const { data, error } = await supabase
        .from('user_progress')
        .select(
          `
          *,
          learning:learnings(*)
        `
        )
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo progreso de usuario',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} registros de progreso obtenidos`
      );
      return (data as any) || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo progreso de usuario',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contenidos recomendados para el usuario
   */
  static async getRecommendedLearnings(
    userId: string,
    limit: number = 10
  ): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contenidos recomendados', {
        userId,
        limit,
      });

      // Obtener IDs de contenidos ya completados
      const { data: completedIds, error: completedError } = await supabase
        .from('user_progress')
        .select('learning_id')
        .eq('user_id', userId);

      if (completedError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contenidos completados',
          completedError
        );
        throw completedError;
      }

      const completedLearningIds = (completedIds || []).map(
        (p) => p.learning_id
      );

      // Obtener contenidos no completados, priorizando principiante y mayor puntaje
      let query = supabase.from('learnings').select('*').eq('is_active', true);

      if (completedLearningIds.length > 0) {
        query = query.not('id', 'in', `(${completedLearningIds.join(',')})`);
      }

      const { data, error } = await query
        .order('difficulty', { ascending: true })
        .order('points', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contenidos recomendados',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contenidos recomendados obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contenidos recomendados',
        error
      );
      throw error;
    }
  }

  /**
   * Marcar contenido como completado
   */
  static async completeLearning(
    userId: string,
    learningId: string,
    score?: number,
    timeSpentSec?: number
  ): Promise<UserProgress> {
    try {
      logger.start(LogModule.DB, 'Marcando contenido como completado', {
        userId,
        learningId,
        score,
        timeSpentSec,
      });

      // Verificar si ya está completado
      const { data: existing, error: existingError } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('learning_id', learningId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        logger.error(
          LogModule.DB,
          'Error verificando progreso existente',
          existingError
        );
        throw existingError;
      }

      if (existing) {
        // Actualizar progreso existente
        const updates: UserProgressUpdate = {
          completed_at: new Date().toISOString(),
        };

        if (score !== undefined) updates.score = score;
        if (timeSpentSec !== undefined) updates.time_spent_sec = timeSpentSec;

        const { data, error } = await supabase
          .from('user_progress')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          logger.error(LogModule.DB, 'Error actualizando progreso', error);
          throw error;
        }

        logger.success(LogModule.DB, 'Progreso actualizado exitosamente');
        return data;
      } else {
        // Crear nuevo progreso
        const progress: UserProgressInsert = {
          user_id: userId,
          learning_id: learningId,
          completed_at: new Date().toISOString(),
          score: score || null,
          time_spent_sec: timeSpentSec || null,
        };

        const { data, error } = await supabase
          .from('user_progress')
          .insert(progress)
          .select()
          .single();

        if (error) {
          logger.error(LogModule.DB, 'Error creando progreso', error);
          throw error;
        }

        logger.success(
          LogModule.DB,
          'Contenido marcado como completado exitosamente'
        );
        return data;
      }
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal completando contenido', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de aprendizaje del usuario
   */
  static async getUserLearningStats(userId: string) {
    try {
      logger.database(LogModule.DB, 'Calculando estadísticas de aprendizaje', {
        userId,
      });

      // Obtener todo el progreso del usuario
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select(
          `
          *,
          learning:learnings(points, category, difficulty, duration_sec)
        `
        )
        .eq('user_id', userId);

      if (progressError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo progreso para estadísticas',
          progressError
        );
        throw progressError;
      }

      const userProgress = (progress as any) || [];

      // Obtener total de contenidos disponibles
      const { count: totalContent, error: totalError } = await supabase
        .from('learnings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (totalError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo total de contenidos',
          totalError
        );
        throw totalError;
      }

      // Calcular estadísticas
      const completedContent = userProgress.length;
      const totalPointsEarned = userProgress.reduce(
        (sum: number, p: any) => sum + (p.learning?.points || 0),
        0
      );

      const totalTimeSpent = userProgress.reduce(
        (sum: number, p: any) =>
          sum + (p.time_spent_sec || p.learning?.duration_sec || 0),
        0
      );

      const averageScore =
        userProgress.length > 0
          ? userProgress
              .filter((p: any) => p.score !== null)
              .reduce((sum: number, p: any) => sum + p.score, 0) /
            userProgress.filter((p: any) => p.score !== null).length
          : 0;

      // Agrupar por categoría
      const byCategory = userProgress.reduce((acc: any, p: any) => {
        const category = p.learning?.category || 'unknown';
        if (!acc[category]) {
          acc[category] = { count: 0, points: 0, timeSpent: 0 };
        }
        acc[category].count++;
        acc[category].points += p.learning?.points || 0;
        acc[category].timeSpent +=
          p.time_spent_sec || p.learning?.duration_sec || 0;
        return acc;
      }, {});

      // Agrupar por dificultad
      const byDifficulty = userProgress.reduce((acc: any, p: any) => {
        const difficulty = p.learning?.difficulty || 'unknown';
        if (!acc[difficulty]) {
          acc[difficulty] = { count: 0, points: 0 };
        }
        acc[difficulty].count++;
        acc[difficulty].points += p.learning?.points || 0;
        return acc;
      }, {});

      // Racha de aprendizaje (días consecutivos)
      const completionDates = userProgress
        .map((p: any) => p.completed_at.split('T')[0])
        .sort()
        .reverse();

      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 1;

      if (completionDates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .split('T')[0];

        // Verificar si aprendió hoy o ayer para mantener la racha
        if (completionDates[0] === today || completionDates[0] === yesterday) {
          currentStreak = 1;

          for (let i = 1; i < completionDates.length; i++) {
            const currentDate = new Date(completionDates[i - 1]);
            const prevDate = new Date(completionDates[i]);
            const diffDays = Math.round(
              (currentDate.getTime() - prevDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            if (diffDays === 1) {
              currentStreak++;
              tempStreak++;
            } else {
              maxStreak = Math.max(maxStreak, tempStreak);
              tempStreak = 1;
            }
          }
        }

        maxStreak = Math.max(maxStreak, tempStreak);
      }

      const stats = {
        completedContent,
        totalContent: totalContent || 0,
        completionRate:
          (totalContent || 0) > 0
            ? (completedContent / (totalContent || 1)) * 100
            : 0,
        totalPointsEarned,
        totalTimeSpentMinutes: Math.round(totalTimeSpent / 60),
        averageScore: Math.round(averageScore * 10) / 10,
        currentStreak,
        maxStreak,
        byCategory,
        byDifficulty,
        lastCompleted:
          userProgress.length > 0 ? userProgress[0].completed_at : null,
      };

      logger.success(
        LogModule.DB,
        'Estadísticas de aprendizaje calculadas',
        stats
      );
      return stats;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error calculando estadísticas de aprendizaje',
        error
      );
      throw error;
    }
  }

  /**
   * Buscar contenidos educativos
   */
  static async searchLearnings(
    query: string,
    category?: string,
    difficulty?: string,
    limit: number = 20
  ): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Buscando contenidos educativos', {
        query,
        category,
        difficulty,
        limit,
      });

      let supabaseQuery = supabase
        .from('learnings')
        .select('*')
        .eq('is_active', true);

      // Filtrar por texto de búsqueda
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%`
        );
      }

      // Filtrar por categoría
      if (category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }

      // Filtrar por dificultad
      if (difficulty) {
        supabaseQuery = supabaseQuery.eq('difficulty', difficulty);
      }

      const { data, error } = await supabaseQuery
        .order('points', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error(LogModule.DB, 'Error buscando contenidos', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contenidos encontrados`
      );
      return data || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal buscando contenidos', error);
      throw error;
    }
  }

  /**
   * Obtener contenidos por tags
   */
  static async getLearningsByTags(tags: string[]): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo contenidos por tags', { tags });

      const { data, error } = await supabase
        .from('learnings')
        .select('*')
        .eq('is_active', true)
        .overlaps('tags', tags)
        .order('points', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contenidos por tags',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} contenidos con tags obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo contenidos por tags',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener learning path sugerido (secuencia de contenidos)
   */
  static async getSuggestedPath(
    userId: string,
    category?: string
  ): Promise<Learning[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo path de aprendizaje sugerido', {
        userId,
        category,
      });

      // Obtener nivel del usuario basado en contenidos completados
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select('learning:learnings(difficulty)')
        .eq('user_id', userId);


      // Obtener contenidos recomendados
      const recommended = await this.getRecommendedLearnings(userId, 20);

      // Filtrar por categoría si se especifica
      let filtered = recommended;
      if (category) {
        filtered = recommended.filter((l) => l.category === category);
      }

      // Ordenar por dificultad progresiva y duración
      const sorted = filtered.sort((a, b) => {
        const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        const aDiff =
          difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 1;
        const bDiff =
          difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 1;

        if (aDiff !== bDiff) return aDiff - bDiff;
        return (a.duration_sec || 0) - (b.duration_sec || 0);
      });

      logger.success(
        LogModule.DB,
        `Path con ${sorted.length} contenidos generado`
      );
      return sorted.slice(0, 10); // Límite de 10 contenidos en el path
    } catch (error) {
      logger.error(LogModule.DB, 'Error generando path de aprendizaje', error);
      throw error;
    }
  }
}
