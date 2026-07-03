/**
 * Servicio de presupuestos (budgets). Fuente:
 * docs/features/budgets/budgets-functional-specs.md (CU-1..CU-5).
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - El cliente NUNCA escribe `spent`: lo mantiene el trigger `update_budget_spent`.
 * - Errores: se loguean y se relanzan para que el store/UI los mapeen.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { uuid } from '@/lib/idb';
import type { BudgetRow, BudgetInsert } from '@/types/database';

export interface CreateBudgetInput {
  category_id: string;
  amount: number;
  /** YYYY-MM-DD */
  start_date: string;
  /** YYYY-MM-DD */
  end_date: string;
}

/** Columnas de la categoría anidada. */
const CATEGORY_JOIN = '*, category:transaction_categories(id,name,emoji,color)';

export class BudgetsService {
  /** Presupuestos activos del usuario, con join de categoría (CU-1). */
  static async fetchActive(userId: string): Promise<BudgetRow[]> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(CATEGORY_JOIN)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetRow[];
    } catch (error) {
      logger.error(LogModule.BUDGETS, 'Error listando presupuestos activos', error);
      throw error;
    }
  }

  /** Presupuestos vencidos (historial), más recientes primero (CU-5). */
  static async fetchHistory(userId: string): Promise<BudgetRow[]> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(CATEGORY_JOIN)
        .eq('user_id', userId)
        .eq('status', 'expired')
        .order('end_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetRow[];
    } catch (error) {
      logger.error(LogModule.BUDGETS, 'Error listando historial de presupuestos', error);
      throw error;
    }
  }

  /** Crea un presupuesto activo (CU-2). Devuelve la fila insertada con join. */
  static async create(userId: string, input: CreateBudgetInput): Promise<BudgetRow> {
    const id = uuid();
    const payload: BudgetInsert & { id: string } = {
      id,
      user_id: userId,
      category_id: input.category_id,
      amount: input.amount,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert(payload)
        .select(CATEGORY_JOIN)
        .single();
      if (error) throw error;
      return data as unknown as BudgetRow;
    } catch (error) {
      logger.error(LogModule.BUDGETS, 'Error creando presupuesto', error);
      throw error;
    }
  }

  /**
   * Renueva un presupuesto vencido (CU-4): crea uno nuevo activo con
   * `renewed_from_id` y marca el anterior como `expired`.
   */
  static async renew(
    userId: string,
    expiredBudgetId: string,
    input: CreateBudgetInput
  ): Promise<BudgetRow> {
    const id = uuid();
    const payload: BudgetInsert & { id: string } = {
      id,
      user_id: userId,
      category_id: input.category_id,
      amount: input.amount,
      start_date: input.start_date,
      end_date: input.end_date,
      renewed_from_id: expiredBudgetId,
    };
    try {
      // Marcar el anterior como expirado primero (libera el índice único).
      const { error: expireErr } = await supabase
        .from('budgets')
        .update({ status: 'expired' })
        .eq('id', expiredBudgetId)
        .eq('user_id', userId);
      if (expireErr) throw expireErr;

      const { data, error } = await supabase
        .from('budgets')
        .insert(payload)
        .select(CATEGORY_JOIN)
        .single();
      if (error) throw error;
      return data as unknown as BudgetRow;
    } catch (error) {
      logger.error(LogModule.BUDGETS, 'Error renovando presupuesto', error);
      throw error;
    }
  }
}
