import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import type { StreakData } from '../types/gamification.types';
import { shouldBreakStreak } from '../utils/formulas';
import { STREAK_RULES } from '../utils/constants';
import { XPService } from './xp.service';

export class StreaksService {
  /**
   * Actualizar racha del usuario después de una actividad
   */
  static async updateStreak(userId: string, eventTimestamp: Date = new Date()): Promise<StreakData> {
    try {
      logger.start(LogModule.DB, 'Actualizando racha de usuario', { userId, eventTimestamp });

      // Obtener racha actual del usuario
      const currentStreak = await this.getUserStreak(userId);
      
      if (!currentStreak) {
        // Crear nueva racha si no existe
        return await this.createNewStreak(userId, eventTimestamp);
      }

      const lastActivity = new Date(currentStreak.last_activity_at);
      const daysSinceLastActivity = this.getDaysDifference(lastActivity, eventTimestamp);

      let updatedStreak: StreakData;

      if (daysSinceLastActivity === 0) {
        // Misma fecha, solo actualizar timestamp
        updatedStreak = await this.updateStreakTimestamp(currentStreak, eventTimestamp);
      } else if (daysSinceLastActivity === 1) {
        // Día consecutivo, incrementar racha
        updatedStreak = await this.incrementStreak(currentStreak, eventTimestamp);
        
        // Otorgar XP por racha diaria
        await XPService.awardStreakXP(userId, updatedStreak.current_streak);
      } else {
        // Más de 1 día, verificar si debe romperse
        const shouldBreak = shouldBreakStreak(lastActivity, eventTimestamp);
        
        if (shouldBreak) {
          // Verificar si tiene protecciones disponibles
          const canUseProtection = this.canUseProtection(currentStreak);
          
          if (canUseProtection) {
            // Usar protección y mantener racha
            updatedStreak = await this.useStreakProtection(currentStreak, eventTimestamp);
          } else {
            // Romper racha y empezar nueva
            updatedStreak = await this.resetStreak(currentStreak, eventTimestamp);
          }
        } else {
          // Dentro del margen de gracia, mantener racha
          updatedStreak = await this.updateStreakTimestamp(currentStreak, eventTimestamp);
        }
      }

      logger.success(LogModule.DB, 'Racha actualizada exitosamente', {
        userId,
        currentStreak: updatedStreak.current_streak,
        maxStreak: updatedStreak.max_streak,
      });

      return updatedStreak;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal actualizando racha', error);
      throw error;
    }
  }

  /**
   * Obtener racha actual del usuario
   */
  static async getUserStreak(userId: string): Promise<StreakData | null> {
    try {
      logger.database(LogModule.DB, 'Obteniendo racha del usuario', { userId });

      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error(LogModule.DB, 'Error obteniendo racha', error);
        
        // Si es error de tabla no encontrada, retornar null
        if (error.message?.includes('relation "public.user_streaks" does not exist') ||
            error.message?.includes('Could not find the table')) {
          logger.warn(LogModule.DB, 'Tabla user_streaks no existe, retornando null');
          return null;
        }
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal obteniendo racha', error);
      
      // Si es error de tabla no encontrada, retornar null
      if (error instanceof Error && 
          (error.message?.includes('relation "public.user_streaks" does not exist') ||
           error.message?.includes('Could not find the table'))) {
        logger.warn(LogModule.DB, 'Tabla user_streaks no existe, retornando null');
        return null;
      }
      throw error;
    }
  }

  /**
   * Usar protección de racha si está disponible
   */
  static async useStreakProtection(userId: string): Promise<boolean> {
    try {
      logger.info(LogModule.DB, 'Intentando usar protección de racha', { userId });

      const streak = await this.getUserStreak(userId);
      
      if (!streak) {
        throw new Error('Usuario no tiene racha activa');
      }

      if (!this.canUseProtection(streak)) {
        logger.warn(LogModule.DB, 'No hay protecciones disponibles', {
          used: streak.streak_protections_used,
          maxPerMonth: STREAK_RULES.PROTECTIONS_PER_MONTH,
        });
        return false;
      }

      // Usar protección
      const { error } = await supabase
        .from('user_streaks')
        .update({
          streak_protections_used: streak.streak_protections_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', streak.id);

      if (error) {
        logger.error(LogModule.DB, 'Error usando protección de racha', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Protección de racha usada exitosamente');
      return true;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal usando protección', error);
      throw error;
    }
  }

  /**
   * Verificar si la racha debería romperse
   */
  static async checkStreakBreak(userId: string): Promise<boolean> {
    try {
      const streak = await this.getUserStreak(userId);
      
      if (!streak) {
        return false; // No hay racha que romper
      }

      const lastActivity = new Date(streak.last_activity_at);
      return shouldBreakStreak(lastActivity);
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando ruptura de racha', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas globales de rachas
   */
  static async getGlobalStreakStats(): Promise<{
    averageStreak: number;
    maxStreak: number;
    activeStreaks: number;
    protectionsUsed: number;
  }> {
    try {
      logger.database(LogModule.DB, 'Obteniendo estadísticas globales de rachas');

      const { data, error } = await supabase
        .from('user_streaks')
        .select('current_streak, max_streak, streak_protections_used');

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo estadísticas de rachas', error);
        throw error;
      }

      const streaks = data || [];
      const activeStreaks = streaks.filter(s => s.current_streak > 0).length;
      const averageStreak = streaks.length > 0 
        ? streaks.reduce((sum, s) => sum + s.current_streak, 0) / streaks.length 
        : 0;
      const maxStreak = streaks.length > 0 
        ? Math.max(...streaks.map(s => s.max_streak))
        : 0;
      const protectionsUsed = streaks.reduce((sum, s) => sum + s.streak_protections_used, 0);

      const stats = {
        averageStreak: Math.round(averageStreak * 10) / 10,
        maxStreak,
        activeStreaks,
        protectionsUsed,
      };

      logger.success(LogModule.DB, 'Estadísticas globales calculadas', stats);
      return stats;
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculando estadísticas globales', error);
      throw error;
    }
  }

  // Métodos privados auxiliares

  /**
   * Crear nueva racha para usuario
   */
  private static async createNewStreak(userId: string, timestamp: Date): Promise<StreakData> {
    const { data, error } = await supabase
      .from('user_streaks')
      .insert({
        user_id: userId,
        current_streak: 1,
        max_streak: 1,
        last_activity_at: timestamp.toISOString(),
        streak_protections_used: 0,
        protection_reset_date: this.getNextResetDate().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      logger.error(LogModule.DB, 'Error creando nueva racha', error);
      throw error;
    }

    return data;
  }

  /**
   * Incrementar racha actual
   */
  private static async incrementStreak(streak: StreakData, timestamp: Date): Promise<StreakData> {
    const newCurrentStreak = streak.current_streak + 1;
    const newMaxStreak = Math.max(streak.max_streak, newCurrentStreak);

    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        current_streak: newCurrentStreak,
        max_streak: newMaxStreak,
        last_activity_at: timestamp.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', streak.id)
      .select()
      .single();

    if (error) {
      logger.error(LogModule.DB, 'Error incrementando racha', error);
      throw error;
    }

    return data;
  }

  /**
   * Actualizar solo timestamp de última actividad
   */
  private static async updateStreakTimestamp(streak: StreakData, timestamp: Date): Promise<StreakData> {
    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        last_activity_at: timestamp.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', streak.id)
      .select()
      .single();

    if (error) {
      logger.error(LogModule.DB, 'Error actualizando timestamp de racha', error);
      throw error;
    }

    return data;
  }

  /**
   * Resetear racha a 1 (nueva actividad después de romperse)
   */
  private static async resetStreak(streak: StreakData, timestamp: Date): Promise<StreakData> {
    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        current_streak: 1,
        last_activity_at: timestamp.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', streak.id)
      .select()
      .single();

    if (error) {
      logger.error(LogModule.DB, 'Error reseteando racha', error);
      throw error;
    }

    return data;
  }

  /**
   * Usar protección de racha
   */
  private static async useStreakProtection(streak: StreakData, timestamp: Date): Promise<StreakData> {
    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        last_activity_at: timestamp.toISOString(),
        streak_protections_used: streak.streak_protections_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streak.id)
      .select()
      .single();

    if (error) {
      logger.error(LogModule.DB, 'Error usando protección de racha', error);
      throw error;
    }

    return data;
  }

  /**
   * Verificar si puede usar protección de racha
   */
  private static canUseProtection(streak: StreakData): boolean {
    const now = new Date();
    const resetDate = new Date(streak.protection_reset_date);
    
    // Si ya pasó la fecha de reset, reiniciar contador
    if (now > resetDate) {
      return true; // Se reinició el contador mensual
    }
    
    return streak.streak_protections_used < STREAK_RULES.PROTECTIONS_PER_MONTH;
  }

  /**
   * Calcular diferencia en días entre dos fechas
   */
  private static getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Obtener próxima fecha de reset (primer día del próximo mes)
   */
  private static getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, STREAK_RULES.RESET_DAY);
    return nextMonth;
  }
}