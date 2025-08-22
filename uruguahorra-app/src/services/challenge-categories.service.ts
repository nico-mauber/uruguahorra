import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import type {
  ChallengeCategory,
  Challenge,
  ChallengeFilters,
  ChallengesResponse,
  CategoryWithChallenges,
} from '@/types/challenge-system.types';

/**
 * Servicio para gestionar las categorías de retos y sus challenges asociados
 */
export class ChallengeCategoriesService {
  /**
   * Obtiene todas las categorías activas ordenadas por sort_order
   */
  static async getActiveCategories(): Promise<ChallengeCategory[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo categorías activas de retos');

      const { data, error } = await supabase
        .from('challenge_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo categorías de retos',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} categorías obtenidas`,
        { count: data?.length }
      );

      return data || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal obteniendo categorías', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los retos de una categoría específica
   */
  static async getChallengesByCategory(
    categoryId: string,
    filters?: ChallengeFilters
  ): Promise<Challenge[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo retos por categoría', {
        categoryId,
        filters,
      });

      let query = supabase
        .from('challenges')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true);

      // Aplicar filtros si existen
      if (filters?.difficulty) {
        const difficulties = Array.isArray(filters.difficulty)
          ? filters.difficulty
          : [filters.difficulty];
        query = query.in('difficulty', difficulties);
      }

      if (filters?.type) {
        const types = Array.isArray(filters.type)
          ? filters.type
          : [filters.type];
        query = query.in('type', types);
      }

      if (filters?.minXp) {
        query = query.gte('xp_reward', filters.minXp);
      }

      if (filters?.maxXp) {
        query = query.lte('xp_reward', filters.maxXp);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Ordenar por dificultad y XP
      const { data, error } = await query
        .order('difficulty', { ascending: true })
        .order('xp_reward', { ascending: true });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo retos por categoría',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} retos obtenidos para categoría ${categoryId}`,
        { categoryId, count: data?.length }
      );

      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo retos por categoría',
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene todas las categorías con sus retos asociados
   */
  static async getCategoriesWithChallenges(
    filters?: ChallengeFilters
  ): Promise<CategoryWithChallenges[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo categorías con retos asociados', {
        filters,
      });

      // Primero obtener categorías
      const categories = await this.getActiveCategories();

      // Luego obtener retos para cada categoría
      const categoriesWithChallenges = await Promise.all(
        categories.map(async (category) => {
          const challenges = await this.getChallengesByCategory(
            category.name,
            filters
          );

          return {
            ...category,
            challenges,
            challengeCount: challenges.length,
          } as CategoryWithChallenges;
        })
      );

      // Filtrar categorías que tengan al menos un reto (si se aplican filtros)
      const filteredCategories = filters
        ? categoriesWithChallenges.filter((cat) => cat.challengeCount > 0)
        : categoriesWithChallenges;

      logger.success(
        LogModule.DB,
        `${filteredCategories.length} categorías con retos obtenidas`,
        {
          totalCategories: categories.length,
          filteredCategories: filteredCategories.length,
        }
      );

      return filteredCategories;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error obteniendo categorías con retos',
        error
      );
      throw error;
    }
  }

  /**
   * Busca retos en todas las categorías con filtros avanzados
   */
  static async searchChallenges(
    filters: ChallengeFilters,
    searchTerm?: string
  ): Promise<ChallengesResponse> {
    try {
      logger.start(LogModule.DB, 'Buscando retos con filtros', {
        filters,
        searchTerm,
      });

      let query = supabase.from('challenges').select('*').eq('is_active', true);

      // Aplicar filtros
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.difficulty) {
        const difficulties = Array.isArray(filters.difficulty)
          ? filters.difficulty
          : [filters.difficulty];
        query = query.in('difficulty', difficulties);
      }

      if (filters.type) {
        const types = Array.isArray(filters.type)
          ? filters.type
          : [filters.type];
        query = query.in('type', types);
      }

      if (filters.minXp) {
        query = query.gte('xp_reward', filters.minXp);
      }

      if (filters.maxXp) {
        query = query.lte('xp_reward', filters.maxXp);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Búsqueda por texto si se proporciona
      if (searchTerm && searchTerm.trim()) {
        query = query.or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }

      const { data: challenges, error } = await query
        .order('category', { ascending: true })
        .order('difficulty', { ascending: true });

      if (error) {
        logger.error(LogModule.DB, 'Error buscando retos', error);
        throw error;
      }

      // Obtener categorías para el response
      const categories = await this.getActiveCategories();

      const response: ChallengesResponse = {
        challenges: challenges || [],
        categories,
        totalCount: challenges?.length || 0,
      };

      logger.success(LogModule.DB, `${response.totalCount} retos encontrados`, {
        totalCount: response.totalCount,
        searchTerm,
      });

      return response;
    } catch (error) {
      logger.error(LogModule.DB, 'Error buscando retos', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de una categoría específica
   */
  static async getCategoryStats(categoryName: string): Promise<{
    totalChallenges: number;
    challengesByDifficulty: Record<string, number>;
    averageXp: number;
    totalPossibleXp: number;
  }> {
    try {
      logger.start(LogModule.DB, 'Obteniendo estadísticas de categoría', {
        categoryName,
      });

      const challenges = await this.getChallengesByCategory(categoryName);

      const stats = {
        totalChallenges: challenges.length,
        challengesByDifficulty: challenges.reduce(
          (acc, challenge) => {
            acc[challenge.difficulty] = (acc[challenge.difficulty] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        averageXp:
          challenges.length > 0
            ? Math.round(
                challenges.reduce((sum, c) => sum + c.xp_reward, 0) /
                  challenges.length
              )
            : 0,
        totalPossibleXp: challenges.reduce((sum, c) => sum + c.xp_reward, 0),
      };

      logger.success(LogModule.DB, 'Estadísticas de categoría obtenidas', {
        categoryName,
        stats,
      });

      return stats;
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo estadísticas', error);
      throw error;
    }
  }

  /**
   * Obtiene retos recomendados para un usuario basado en su historial
   * (Por ahora implementación básica, se puede mejorar con ML)
   */
  static async getRecommendedChallenges(
    userId: string,
    limit: number = 6
  ): Promise<Challenge[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo retos recomendados', {
        userId,
        limit,
      });

      // TODO: Implementar lógica de recomendación basada en:
      // - Historial de retos completados
      // - Categorías preferidas
      // - Nivel de dificultad apropiado
      // - Retos similares completados por otros usuarios

      // Por ahora, devolver una mezcla de diferentes categorías y dificultades
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .in('difficulty', ['easy', 'medium']) // Empezar con retos accesibles
        .limit(limit);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo retos recomendados',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${challenges?.length || 0} retos recomendados obtenidos`,
        { userId, count: challenges?.length }
      );

      return challenges || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo recomendaciones', error);
      throw error;
    }
  }
}
