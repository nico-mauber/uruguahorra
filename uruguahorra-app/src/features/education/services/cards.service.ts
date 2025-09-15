import { supabase } from '../../../lib/supabase';
import type { 
  EducationModule, 
  EducationCard, 
  UserCardProgress, 
  ModuleProgress,
  CardProgress,
  CardReadResult,
  ModuleProgressData,
  UserEducationStats
} from '../types';

export class CardsService {
  /**
   * Obtiene todos los módulos educativos activos
   */
  static async getModules(): Promise<EducationModule[]> {
    try {
      const { data, error } = await supabase
        .from('education_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching education modules:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('CardsService.getModules error:', error);
      throw error;
    }
  }

  /**
   * Obtiene las cards de un módulo específico
   */
  static async getModuleCards(moduleId: string): Promise<EducationCard[]> {
    try {
      const { data, error } = await supabase
        .from('education_cards')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching module cards:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('CardsService.getModuleCards error:', error);
      throw error;
    }
  }

  /**
   * Obtiene el progreso del usuario en cards
   */
  static async getUserCardProgress(userId: string, moduleId?: string): Promise<UserCardProgress[]> {
    try {
      let query = supabase
        .from('user_card_progress')
        .select('*')
        .eq('user_id', userId);

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user card progress:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('CardsService.getUserCardProgress error:', error);
      throw error;
    }
  }

  /**
   * Marca una card como leída
   */
  static async markCardAsRead(
    userId: string,
    cardId: string,
    readingTimeSeconds: number = 0
  ): Promise<CardReadResult> {
    try {
      const { data, error } = await supabase
        .rpc('mark_card_as_read', {
          p_user_id: userId,
          p_card_id: cardId,
          p_reading_time_seconds: readingTimeSeconds
        });

      if (error) {
        console.error('Error marking card as read:', error);
        throw error;
      }

      return data as CardReadResult;
    } catch (error) {
      console.error('CardsService.markCardAsRead error:', error);
      throw error;
    }
  }

  /**
   * Obtiene el progreso de un módulo específico con toda la información
   */
  static async getModuleProgress(userId: string, moduleId: string): Promise<ModuleProgress> {
    try {
      // Get all modules progress and find the specific one
      const allProgress = await this.getAllModulesProgress(userId);
      const moduleProgress = allProgress.find(mp => mp.module.id === moduleId);
      
      if (!moduleProgress) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      return moduleProgress;
    } catch (error) {
      console.error('CardsService.getModuleProgress error:', error);
      throw error;
    }
  }

  /**
   * Obtiene el progreso completo de todos los módulos para un usuario
   */
  static async getAllModulesProgress(userId: string): Promise<ModuleProgress[]> {
    try {
      const [modules, allUserProgress] = await Promise.all([
        this.getModules(),
        this.getUserCardProgress(userId)
      ]);

      const moduleProgressList: ModuleProgress[] = [];

      for (const module of modules) {
        // Obtener cards del módulo
        const cards = await this.getModuleCards(module.id);
        
        // Filtrar progreso para este módulo
        const moduleProgress = allUserProgress.filter(p => p.module_id === module.id);
        const progressMap = new Map(moduleProgress.map(p => [p.card_id, p]));

        // Crear lista de progreso de cards
        const cardProgressList: CardProgress[] = cards.map((card, index) => {
          const progress = progressMap.get(card.id);
          const isFirstCard = index === 0;
          const previousCardRead = index === 0 ? true : 
            progressMap.get(cards[index - 1].id)?.is_read || false;
          
          return {
            card,
            progress,
            is_read: progress?.is_read || false,
            is_unlocked: isFirstCard || previousCardRead
          };
        });

        const readCards = cardProgressList.filter(cp => cp.is_read).length;
        const totalCards = cards.length;
        const completionPercentage = totalCards > 0 ? (readCards / totalCards) * 100 : 0;

        // Calcular tiempo total estimado
        const estimatedTotalTime = cards.reduce((total, card) => 
          total + Math.floor(card.reading_time_seconds / 60), 0);

        moduleProgressList.push({
          module,
          total_cards: totalCards,
          read_cards: readCards,
          completion_percentage: completionPercentage,
          is_completed: readCards === totalCards && totalCards > 0,
          estimated_total_time: estimatedTotalTime,
          cards: cardProgressList
        });
      }

      return moduleProgressList;
    } catch (error) {
      console.error('CardsService.getAllModulesProgress error:', error);
      throw error;
    }
  }

  /**
   * Obtiene una card específica por ID
   */
  static async getCard(cardId: string): Promise<EducationCard | null> {
    try {
      const { data, error } = await supabase
        .from('education_cards')
        .select('*')
        .eq('id', cardId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrada
        }
        console.error('Error fetching card:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('CardsService.getCard error:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas simplificadas del usuario
   */
  static async getUserStats(userId: string): Promise<UserEducationStats> {
    try {
      // Obtener progreso total del usuario usando el método eficiente
      const allModulesProgress = await this.getAllModulesProgress(userId);
      
      // Calcular estadísticas
      const totalCardsRead = allModulesProgress.reduce((total, mp) => total + mp.read_cards, 0);
      const totalModulesCompleted = allModulesProgress.filter(mp => mp.is_completed).length;
      
      // Obtener progreso detallado para tiempo de estudio
      const userProgress = await this.getUserCardProgress(userId);
      const totalStudyTimeMinutes = userProgress.reduce((total, progress) => 
        total + Math.floor(progress.reading_time_spent_seconds / 60), 0);

      // Calcular racha simple (días con actividad)
      const today = new Date().toISOString().split('T')[0];
      const lastStudyDate = userProgress.length > 0 
        ? userProgress.sort((a, b) => new Date(b.read_at).getTime() - new Date(a.read_at).getTime())[0].read_at.split('T')[0]
        : undefined;

      const currentStreakDays = lastStudyDate === today ? 1 : 0; // Simplificado por ahora

      return {
        total_cards_read: totalCardsRead,
        total_modules_completed: totalModulesCompleted,
        total_study_time_minutes: totalStudyTimeMinutes,
        current_streak_days: currentStreakDays,
        last_study_date: lastStudyDate
      };
    } catch (error) {
      console.error('CardsService.getUserStats error:', error);
      throw error;
    }
  }

  /**
   * Obtiene la siguiente card disponible en un módulo
   */
  static async getNextAvailableCard(userId: string, moduleId: string): Promise<EducationCard | null> {
    try {
      const cards = await this.getModuleCards(moduleId);
      const userProgress = await this.getUserCardProgress(userId, moduleId);
      const progressMap = new Map(userProgress.map(p => [p.card_id, p]));

      // Encontrar la primera card no leída
      for (const card of cards) {
        const progress = progressMap.get(card.id);
        if (!progress || !progress.is_read) {
          return card;
        }
      }

      return null; // Todas las cards están leídas
    } catch (error) {
      console.error('CardsService.getNextAvailableCard error:', error);
      throw error;
    }
  }

  /**
   * Formatea el tiempo de lectura para display
   */
  static formatReadingTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seg`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes} min`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
  }

  /**
   * Calcula el tiempo estimado para completar un módulo
   */
  static calculateModuleEstimatedTime(cards: EducationCard[]): number {
    return cards.reduce((total, card) => total + card.reading_time_seconds, 0);
  }
}