/**
 * Servicio de transacciones. Fuente: docs/api/contracts-and-data-mapping.md §2.5/§2.6,
 * docs/features/transactions/transactions-functional-specs.md (CU-1..CU-4).
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - El cliente nunca escribe agregados/derivados de categoría
 *   (`category_name`/`category_emoji`): los mantiene el trigger
 *   `auto_categorize_new_transaction`, que además sincroniza `type`.
 * - Errores: se loguean y se relanzan para que el store/UI los mapeen.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { uuid } from '@/lib/idb';
import { OfflineQueueService } from './OfflineQueueService';
import type {
  FrequentTransaction,
  TransactionCategoryRow,
  TransactionInsert,
  TransactionRow,
} from '@/types/database';

export interface GetUserTransactionsParams {
  user_id: string;
  /** YYYY-MM-DD */
  start_date?: string;
  /** YYYY-MM-DD */
  end_date?: string;
  offset?: number;
  limit?: number;
}

export interface CreateQuickTransactionInput {
  amount: number;
  category_id?: string | null;
  description?: string;
  type: 'expense' | 'income' | 'transfer';
}

/** Columnas de la categoría anidada en el listado (CU-1). */
const CATEGORY_JOIN = '*, category:transaction_categories(id,name,emoji,type,color)';

export class TransactionsService {
  /**
   * Lista las transacciones del usuario en un rango, con join de categoría y
   * paginación (CU-1). Orden: `transaction_date desc, created_at desc`.
   */
  static async getUserTransactions(
    params: GetUserTransactionsParams
  ): Promise<TransactionRow[]> {
    const { user_id, start_date, end_date, offset = 0, limit = 1000 } = params;
    try {
      let query = supabase
        .from('transactions')
        .select(CATEGORY_JOIN)
        .eq('user_id', user_id)
        .is('deleted_at', null);

      if (start_date) {
        query = query.gte('created_at', `${start_date}T00:00:00Z`);
      }
      if (end_date) {
        query = query.lte('created_at', `${end_date}T23:59:59Z`);
      }

      const { data, error } = await query
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data ?? []) as unknown as TransactionRow[];
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error listando transacciones', error);
      throw error;
    }
  }

  /** Lista las categorías de transacción (lectura pública, §2.6). */
  static async fetchCategories(): Promise<TransactionCategoryRow[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return (data ?? []) as TransactionCategoryRow[];
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error listando categorías de transacción',
        error
      );
      throw error;
    }
  }

  /**
   * Crea una transacción rápida (CU-2). El trigger auto-categoriza si
   * `category_id` es null y sincroniza `type` con la categoría. Devuelve la
   * fila insertada.
   */
  static async createQuickTransaction(
    userId: string,
    input: CreateQuickTransactionInput
  ): Promise<TransactionRow> {
    const id = uuid();
    const payload: TransactionInsert & { id: string } = {
      id,
      user_id: userId,
      amount: input.amount,
      category_id: input.category_id ?? null,
      description: input.description ?? null,
      type: input.type,
      transaction_date: new Date().toISOString().slice(0, 10),
      xp_earned: 5,
    };
    const optimistic = () => ({ ...payload, created_at: new Date().toISOString() }) as unknown as TransactionRow;

    // Offline: encolar + fila optimista (§4.2).
    if (!navigator.onLine) {
      await OfflineQueueService.enqueue({ id, entity: 'transaction', operation: 'insert', table: 'transactions', payload: payload as unknown as Record<string, unknown> });
      return optimistic();
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as TransactionRow;
    } catch (error) {
      if (error instanceof TypeError) {
        await OfflineQueueService.enqueue({ id, entity: 'transaction', operation: 'insert', table: 'transactions', payload: payload as unknown as Record<string, unknown> });
        return optimistic();
      }
      logger.error(LogModule.TRANSACTIONS, 'Error creando transacción', error);
      throw error;
    }
  }

  /** Soft delete: marca la transacción como eliminada (CU-4). */
  static async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error eliminando transacción', error);
      throw error;
    }
  }

  /**
   * Transacciones frecuentes (CU-3): agrupa las últimas 100 expenses por
   * (descripción + categoría), conserva grupos con ≥2 ocurrencias, calcula el
   * monto promedio y devuelve las `limit` más frecuentes.
   */
  static async getFrequentTransactions(
    userId: string,
    limit = 5
  ): Promise<FrequentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('description, category_id, amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        description: string | null;
        category_id: string | null;
        amount: number;
      }>;

      const groups = new Map<
        string,
        {
          description: string;
          categoryId: string | null;
          count: number;
          total: number;
        }
      >();

      for (const row of rows) {
        const description = row.description ?? '';
        const categoryId = row.category_id ?? null;
        const key = `${description}|${categoryId ?? ''}`;
        const existing = groups.get(key);
        if (existing) {
          existing.count += 1;
          existing.total += row.amount;
        } else {
          groups.set(key, {
            description,
            categoryId,
            count: 1,
            total: row.amount,
          });
        }
      }

      return Array.from(groups.values())
        .filter((g) => g.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((g) => ({
          description: g.description,
          categoryId: g.categoryId,
          count: g.count,
          avgAmount: g.total / g.count,
        }));
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error obteniendo transacciones frecuentes',
        error
      );
      throw error;
    }
  }
}
