/**
 * Goal Types Service - Gestión de tipos de metas dinámicos
 * Permite manejar tipos de metas del sistema y personalizados
 */

import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

export interface GoalType {
  id: string;
  name: string;
  description: string;
  emoji: string;
  icon: string;
  color: string;
  category: string;
  is_system: boolean;
  suggested_duration_months: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateGoalTypeInput {
  name: string;
  description?: string;
  emoji: string;
  icon: string;
  color: string;
  category: string;
  suggested_duration_months?: number;
}

export class GoalTypesService {
  /**
   * Obtener todos los tipos de metas (sistema + personalizados del usuario)
   */
  static async getAllGoalTypes(userId?: string): Promise<GoalType[]> {
    try {
      logger.info(LogModule.GOALS, 'Obteniendo tipos de metas');

      let query = supabase
        .from('goal_types')
        .select('*')
        .order('is_system', { ascending: false }) // Sistema primero
        .order('created_at', { ascending: true });

      // Si hay usuario, incluir sus tipos personalizados
      if (userId) {
        query = query.or(`is_system.eq.true,created_by.eq.${userId}`);
      } else {
        // Solo tipos del sistema si no hay usuario
        query = query.eq('is_system', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(LogModule.GOALS, 'Error obteniendo tipos de metas', error);
        throw error;
      }

      logger.success(
        LogModule.GOALS,
        `${data?.length || 0} tipos de metas obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error en getAllGoalTypes', error);
      throw error;
    }
  }

  /**
   * Obtener solo los tipos de metas del sistema (predefinidos)
   */
  static async getSystemGoalTypes(): Promise<GoalType[]> {
    try {
      logger.info(LogModule.GOALS, 'Obteniendo tipos de metas del sistema');

      const { data, error } = await supabase
        .from('goal_types')
        .select('*')
        .eq('is_system', true)
        .order('name');

      if (error) {
        logger.error(LogModule.GOALS, 'Error obteniendo tipos sistema', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error en getSystemGoalTypes', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo tipo de meta personalizado
   */
  static async createCustomGoalType(
    userId: string,
    goalTypeData: CreateGoalTypeInput
  ): Promise<GoalType> {
    try {
      logger.info(LogModule.GOALS, 'Creando tipo de meta personalizado', {
        name: goalTypeData.name,
        userId,
      });

      const { data, error } = await supabase
        .from('goal_types')
        .insert({
          ...goalTypeData,
          is_system: false,
          created_by: userId,
          suggested_duration_months:
            goalTypeData.suggested_duration_months || 6,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un tipo de meta con ese nombre');
        }
        logger.error(
          LogModule.GOALS,
          'Error creando tipo personalizado',
          error
        );
        throw error;
      }

      logger.success(LogModule.GOALS, 'Tipo de meta personalizado creado', {
        id: data.id,
        name: data.name,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error en createCustomGoalType', error);
      throw error;
    }
  }

  /**
   * Actualizar un tipo de meta personalizado
   */
  static async updateCustomGoalType(
    goalTypeId: string,
    userId: string,
    updates: Partial<CreateGoalTypeInput>
  ): Promise<GoalType> {
    try {
      logger.info(LogModule.GOALS, 'Actualizando tipo de meta personalizado', {
        goalTypeId,
        userId,
      });

      const { data, error } = await supabase
        .from('goal_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalTypeId)
        .eq('created_by', userId) // Solo el creador puede actualizar
        .eq('is_system', false) // No se pueden actualizar tipos del sistema
        .select()
        .single();

      if (error) {
        logger.error(
          LogModule.GOALS,
          'Error actualizando tipo personalizado',
          error
        );
        throw error;
      }

      if (!data) {
        throw new Error('Tipo de meta no encontrado o sin permisos');
      }

      logger.success(LogModule.GOALS, 'Tipo de meta actualizado exitosamente');
      return data;
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error en updateCustomGoalType', error);
      throw error;
    }
  }

  /**
   * Eliminar un tipo de meta personalizado
   */
  static async deleteCustomGoalType(
    goalTypeId: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(LogModule.GOALS, 'Eliminando tipo de meta personalizado', {
        goalTypeId,
        userId,
      });

      const { error } = await supabase
        .from('goal_types')
        .delete()
        .eq('id', goalTypeId)
        .eq('created_by', userId) // Solo el creador puede eliminar
        .eq('is_system', false); // No se pueden eliminar tipos del sistema

      if (error) {
        logger.error(
          LogModule.GOALS,
          'Error eliminando tipo personalizado',
          error
        );
        throw error;
      }

      logger.success(LogModule.GOALS, 'Tipo de meta eliminado exitosamente');
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error en deleteCustomGoalType', error);
      throw error;
    }
  }

  /**
   * Obtener un tipo de meta específico por ID
   */
  static async getGoalTypeById(goalTypeId: string): Promise<GoalType | null> {
    try {
      const { data, error } = await supabase
        .from('goal_types')
        .select('*')
        .eq('id', goalTypeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(
        LogModule.GOALS,
        'Error obteniendo tipo de meta por ID',
        error
      );
      throw error;
    }
  }

  /**
   * Convertir tipos legacy hardcodeados a formato compatible
   * Útil para migración gradual desde el sistema hardcodeado
   */
  static getLegacyGoalTypeMapping(): Record<string, Partial<GoalType>> {
    return {
      emergency: {
        name: 'Colchón de emergencia',
        emoji: '🛡️',
        icon: 'shield',
        color: '#3B82F6',
        category: 'emergency',
        suggested_duration_months: 6,
      },
      travel: {
        name: 'Viaje',
        emoji: '✈️',
        icon: 'airplane',
        color: '#10B981',
        category: 'travel',
        suggested_duration_months: 12,
      },
      debt: {
        name: 'Pagar deudas',
        emoji: '💳',
        icon: 'card',
        color: '#EF4444',
        category: 'debt',
        suggested_duration_months: 24,
      },
      purchase: {
        name: 'Compra importante',
        emoji: '🛍️',
        icon: 'cart',
        color: '#8B5CF6',
        category: 'purchase',
        suggested_duration_months: 8,
      },
      custom: {
        name: 'Meta personalizada',
        emoji: '🎨',
        icon: 'flag',
        color: '#339AF0',
        category: 'custom',
        suggested_duration_months: 6,
      },
    };
  }
}
