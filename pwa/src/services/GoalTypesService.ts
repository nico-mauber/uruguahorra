/**
 * Servicio de tipos de meta (goal_types).
 * Fuente: docs/api/contracts-and-data-mapping.md §2.4.
 *
 * Lectura pública (RLS permite a todos): devuelve los 10 tipos de sistema más
 * los custom del usuario. Métodos estáticos (state-management §1). Los errores
 * se loguean y se relanzan para que el store/UI los mapeen con getErrorMessage.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import type { GoalTypeRow } from '@/types/database';

export class GoalTypesService {
  /** Lista todos los tipos de meta: primero los de sistema, luego por nombre. */
  static async getAllGoalTypes(): Promise<GoalTypeRow[]> {
    try {
      const { data, error } = await supabase
        .from('goal_types')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return (data ?? []) as GoalTypeRow[];
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error listando tipos de meta', error);
      throw error;
    }
  }
}
