/**
 * Servicio de metas (goals) y contribuciones (micro_contributions).
 * Fuente: docs/api/contracts-and-data-mapping.md §2.2/§2.3,
 * docs/features/goals/goals-functional-specs.md (CU-1..CU-4).
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - El cliente NUNCA escribe `current_amount`/`saved_amount`/`is_completed`:
 *   los mantiene el trigger `update_goal_progress` de BD.
 * - Errores: se loguean y se relanzan para que el store/UI los mapeen con
 *   getErrorMessage. `PGRST116` (0 filas en single) se trata como not-found.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { uuid } from '@/lib/idb';
import { OfflineQueueService } from './OfflineQueueService';
import type {
  GoalInsert,
  GoalRow,
  MicroContributionRow,
} from '@/types/database';

export interface CreateGoalInput {
  name: string;
  target_amount: number;
  /** YYYY-MM-DD */
  target_date: string;
  category?: string;
  color?: string;
  icon?: string;
  goal_type_id?: string | null;
}

export interface UpdateGoalPatch {
  name?: string;
  target_amount?: number;
  /** YYYY-MM-DD */
  target_date?: string;
}

export interface AddContributionInput {
  user_id: string;
  goal_id: string;
  amount: number;
  source?: 'manual' | 'automatic' | 'roundup';
  description?: string;
}

export class GoalsService {
  /** Lista las metas activas del usuario, más recientes primero (CU-1). */
  static async fetchGoals(userId: string): Promise<GoalRow[]> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as GoalRow[];
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error listando metas', error);
      throw error;
    }
  }

  /**
   * Crea una meta (CU-2). Sólo envía los campos permitidos; el trigger
   * inicializa los agregados. Devuelve la fila insertada.
   */
  static async createGoal(
    userId: string,
    input: CreateGoalInput
  ): Promise<GoalRow> {
    try {
      const payload: GoalInsert = {
        ...input,
        saved_amount: 0,
        is_active: true,
        user_id: userId,
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as GoalRow;
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error creando meta', error);
      throw error;
    }
  }

  /** Actualiza campos editables de una meta (CU-3). Devuelve la fila. */
  static async updateGoal(
    goalId: string,
    patch: UpdateGoalPatch
  ): Promise<GoalRow> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update(patch)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data as GoalRow;
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error actualizando meta', error);
      throw error;
    }
  }

  /** Soft delete: marca la meta como inactiva (CU-3). */
  static async deleteGoal(goalId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goalId);

      if (error) throw error;
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error eliminando meta', error);
      throw error;
    }
  }

  /**
   * Registra una contribución (CU-4). El trigger recalcula la meta y la marca
   * completada si corresponde. Devuelve la fila insertada.
   */
  static async addContribution(
    input: AddContributionInput
  ): Promise<MicroContributionRow> {
    const id = uuid();
    const payload = {
      id,
      user_id: input.user_id,
      goal_id: input.goal_id,
      amount: input.amount,
      source: input.source ?? 'manual',
      ...(input.description !== undefined ? { description: input.description } : {}),
    };

    // Offline: encolar + fila optimista (§4.2). El trigger recalcula al sincronizar.
    if (!navigator.onLine) {
      await OfflineQueueService.enqueue({ id, entity: 'contribution', operation: 'insert', table: 'micro_contributions', payload });
      return { ...payload, description: input.description ?? null, created_at: new Date().toISOString() } as MicroContributionRow;
    }

    try {
      const { data, error } = await supabase
        .from('micro_contributions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as MicroContributionRow;
    } catch (error) {
      // Fallo de red → encolar y seguir optimista.
      if (error instanceof TypeError) {
        await OfflineQueueService.enqueue({ id, entity: 'contribution', operation: 'insert', table: 'micro_contributions', payload });
        return { ...payload, description: input.description ?? null, created_at: new Date().toISOString() } as MicroContributionRow;
      }
      logger.error(LogModule.GOALS, 'Error registrando contribución', error);
      throw error;
    }
  }

  /** Lista las contribuciones de una meta, más recientes primero (CU-3). */
  static async getGoalContributions(
    goalId: string
  ): Promise<MicroContributionRow[]> {
    try {
      const { data, error } = await supabase
        .from('micro_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as MicroContributionRow[];
    } catch (error) {
      logger.error(
        LogModule.GOALS,
        'Error listando contribuciones de la meta',
        error
      );
      throw error;
    }
  }
}
