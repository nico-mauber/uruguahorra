import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionCategory,
  TransactionFilters,
  SpendingInsight,
  QuickTransaction,
} from '@/schemas';

// Tipos simplificados mientras se actualiza la base de datos
type DBTransactionInsert = {
  user_id: string;
  amount: number;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_emoji?: string | null;
  type: 'expense' | 'income' | 'transfer';
  transaction_date?: string;
  notes?: string | null;
  location?: string | null;
  tags?: string[] | null;
  payment_method?: string | null;
  mood_before?: number | null;
  mood_after?: number | null;
  regret_level?: number | null;
  necessity_level?: number | null;
  xp_earned?: number | null;
  achievements_unlocked?: string[] | null;
  goal_id?: string | null;
  squad_id?: string | null;
};

type DBTransactionUpdate = Partial<DBTransactionInsert> & {
  updated_at?: string;
  deleted_at?: string | null;
};

export class TransactionsService {
  // ============================================
  // CRUD BÁSICO DE TRANSACCIONES
  // ============================================

  /**
   * Verificar si un usuario tiene transacciones reales
   */
  static async hasUserTransactions(userId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('transactions_with_categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .limit(1);

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error checking user transactions',
          error
        );
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error checking user transactions',
        error
      );
      return false;
    }
  }

  /**
   * Obtener transacciones del usuario con filtros y paginación
   */
  static async getUserTransactions(
    filters: TransactionFilters
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      logger.database(
        LogModule.TRANSACTIONS,
        'Obteniendo transacciones del usuario',
        {
          filters,
        }
      );

      let query = supabase
        .from('transactions_with_categories')
        .select('*', { count: 'exact' })
        .eq('user_id', filters.user_id)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros de fecha - usar created_at ya que las transacciones lo usan
      if (filters.start_date) {
        query = query.gte('created_at', `${filters.start_date}T00:00:00Z`);
      }
      if (filters.end_date) {
        query = query.lte('created_at', `${filters.end_date}T23:59:59Z`);
      }
      if (filters.category_ids && filters.category_ids.length > 0) {
        query = query.in('category_id', filters.category_ids);
      }
      if (filters.types && filters.types.length > 0) {
        query = query.in('type', filters.types);
      }
      if (filters.min_amount) {
        query = query.gte('amount', filters.min_amount);
      }
      if (filters.max_amount) {
        query = query.lte('amount', filters.max_amount);
      }
      if (filters.search) {
        query = query.or(
          `description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
        );
      }
      if (filters.goal_id) {
        query = query.eq('goal_id', filters.goal_id);
      }
      if (filters.squad_id) {
        query = query.eq('squad_id', filters.squad_id);
      }

      // Paginación
      query = query.range(filters.offset, filters.offset + filters.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo transacciones',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        `${data?.length || 0} transacciones obtenidas (total: ${count})`
      );

      return {
        transactions: (data || []) as Transaction[],
        total: count || 0,
      };
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo transacciones',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener una transacción por ID
   */
  static async getTransactionById(
    id: string,
    userId: string
  ): Promise<Transaction | null> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Obteniendo transacción por ID', {
        id,
        userId,
      });

      const { data, error } = await supabase
        .from('transactions_with_categories')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn(LogModule.TRANSACTIONS, 'Transacción no encontrada', {
            id,
          });
          return null;
        }
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo transacción',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción obtenida correctamente'
      );
      return data as Transaction;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo transacción',
        error
      );
      throw error;
    }
  }

  /**
   * Crear transacción rápida (3-tap)
   */
  static async createQuickTransaction(
    userId: string,
    quickTransaction: QuickTransaction
  ): Promise<Transaction> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Creando transacción rápida', {
        userId,
        quickTransaction,
      });

      // Si no se especifica el tipo, lo inferimos de la categoría
      let transactionType = quickTransaction.type;
      if (!transactionType && quickTransaction.category_id) {
        const { data: category } = await supabase
          .from('transaction_categories')
          .select('type')
          .eq('id', quickTransaction.category_id)
          .single();
        transactionType = category?.type as 'expense' | 'income' | 'transfer';
      }

      const transactionData: DBTransactionInsert = {
        user_id: userId,
        amount: quickTransaction.amount,
        description: quickTransaction.description || null,
        category_id: quickTransaction.category_id,
        type: transactionType || 'expense',
        transaction_date: new Date().toISOString().split('T')[0],
        xp_earned: 5, // XP por registrar transacción
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error creando transacción rápida',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción rápida creada correctamente'
      );

      // Obtener la transacción completa con categoría
      const fullTransaction = await this.getTransactionById(data.id, userId);
      return fullTransaction!;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal creando transacción rápida',
        error
      );
      throw error;
    }
  }

  /**
   * Crear transacción completa
   */
  static async createTransaction(
    userId: string,
    transaction: TransactionInsert
  ): Promise<Transaction> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Creando transacción completa', {
        userId,
        transaction,
      });

      const transactionData: DBTransactionInsert = {
        ...transaction,
        user_id: userId,
        xp_earned: transaction.xp_earned || 5,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error creando transacción',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción creada correctamente'
      );

      // Obtener la transacción completa con categoría
      const fullTransaction = await this.getTransactionById(data.id, userId);
      return fullTransaction!;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal creando transacción',
        error
      );
      throw error;
    }
  }

  /**
   * Actualizar transacción
   */
  static async updateTransaction(
    id: string,
    userId: string,
    updates: TransactionUpdate
  ): Promise<Transaction> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Actualizando transacción', {
        id,
        userId,
        updates,
      });

      const { data, error } = await supabase
        .from('transactions')
        .update(updates as DBTransactionUpdate)
        .eq('id', id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error actualizando transacción',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción actualizada correctamente'
      );

      // Obtener la transacción completa con categoría
      const fullTransaction = await this.getTransactionById(data.id, userId);
      return fullTransaction!;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal actualizando transacción',
        error
      );
      throw error;
    }
  }

  /**
   * Eliminar transacción (soft delete)
   */
  static async deleteTransaction(id: string, userId: string): Promise<void> {
    try {
      logger.database(
        LogModule.TRANSACTIONS,
        'Eliminando transacción (soft delete)',
        {
          id,
          userId,
        }
      );

      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error eliminando transacción',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción eliminada correctamente'
      );
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal eliminando transacción',
        error
      );
      throw error;
    }
  }

  // ============================================
  // CATEGORÍAS
  // ============================================

  /**
   * Obtener todas las categorías
   */
  static async getCategories(): Promise<TransactionCategory[]> {
    try {
      logger.database(
        LogModule.TRANSACTIONS,
        'Obteniendo categorías de transacciones'
      );

      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo categorías',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        `${data?.length || 0} categorías obtenidas`
      );
      return (data || []) as TransactionCategory[];
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo categorías',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener categorías por tipo
   */
  static async getCategoriesByType(
    type: 'expense' | 'income' | 'transfer'
  ): Promise<TransactionCategory[]> {
    try {
      logger.database(
        LogModule.TRANSACTIONS,
        'Obteniendo categorías por tipo',
        { type }
      );

      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('type', type)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo categorías por tipo',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        `${data?.length || 0} categorías de tipo ${type} obtenidas`
      );
      return (data || []) as TransactionCategory[];
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo categorías por tipo',
        error
      );
      throw error;
    }
  }

  // ============================================
  // ANALYTICS E INSIGHTS
  // ============================================

  /**
   * Obtener resumen de gastos por categoría
   */
  static async getSpendingSummary(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    categories: Array<{
      category_id: string;
      category_name: string;
      category_emoji: string;
      total_amount: number;
      transaction_count: number;
      percentage: number;
    }>;
    total: number;
  }> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Obteniendo resumen de gastos', {
        userId,
        startDate,
        endDate,
      });

      const { data, error } = await supabase
        .from('transactions')
        .select('category_id, category_name, category_emoji, amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .is('deleted_at', null);

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo resumen de gastos',
          error
        );
        throw error;
      }

      // Agrupar por categoría
      const categoryMap = new Map();
      let total = 0;

      (data || []).forEach((transaction) => {
        const key = transaction.category_id || 'uncategorized';
        const amount = transaction.amount || 0;
        total += amount;

        if (categoryMap.has(key)) {
          const existing = categoryMap.get(key);
          existing.total_amount += amount;
          existing.transaction_count += 1;
        } else {
          categoryMap.set(key, {
            category_id: transaction.category_id,
            category_name: transaction.category_name || 'Sin categoría',
            category_emoji: transaction.category_emoji || '💳',
            total_amount: amount,
            transaction_count: 1,
          });
        }
      });

      // Convertir a array y calcular porcentajes
      const categories = Array.from(categoryMap.values()).map((category) => ({
        ...category,
        percentage: total > 0 ? (category.total_amount / total) * 100 : 0,
      }));

      // Ordenar por monto descendente
      categories.sort((a, b) => b.total_amount - a.total_amount);

      logger.success(
        LogModule.TRANSACTIONS,
        `Resumen de gastos obtenido: ${categories.length} categorías, total: $${total}`
      );

      return { categories, total };
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo resumen de gastos',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener insights psicológicos de gastos
   */
  static async getSpendingInsights(
    userId: string,
    daysBack: number = 30
  ): Promise<SpendingInsight> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Obteniendo insights de gastos', {
        userId,
        daysBack,
      });

      const { data, error } = await supabase.rpc(
        'calculate_user_spending_insights',
        {
          input_user_id: userId,
          days_back: daysBack,
        }
      );

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo insights de gastos',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Insights de gastos obtenidos correctamente'
      );
      return data as SpendingInsight;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo insights de gastos',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener balance del período actual
   */
  static async getCurrentBalance(userId: string): Promise<{
    income: number;
    expenses: number;
    balance: number;
    period: { start: string; end: string };
  }> {
    try {
      logger.database(LogModule.TRANSACTIONS, 'Obteniendo balance actual', {
        userId,
      });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .is('deleted_at', null);

      if (error) {
        logger.error(LogModule.TRANSACTIONS, 'Error obteniendo balance', error);
        throw error;
      }

      let income = 0;
      let expenses = 0;

      (data || []).forEach((transaction) => {
        if (transaction.type === 'income') {
          income += transaction.amount || 0;
        } else if (transaction.type === 'expense') {
          expenses += transaction.amount || 0;
        }
      });

      const balance = income - expenses;

      logger.success(
        LogModule.TRANSACTIONS,
        `Balance obtenido: ingresos $${income}, gastos $${expenses}, balance $${balance}`
      );

      return {
        income,
        expenses,
        balance,
        period: { start: startDate, end: endDate },
      };
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo balance',
        error
      );
      throw error;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Auto-categorizar transacción basada en descripción
   */
  static async autoCategorizeTransaction(
    description: string
  ): Promise<string | null> {
    try {
      logger.database(
        LogModule.TRANSACTIONS,
        'Auto-categorizando transacción',
        {
          description,
        }
      );

      const { data, error } = await supabase.rpc(
        'auto_categorize_transaction',
        {
          description_text: description,
        }
      );

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error auto-categorizando transacción',
          error
        );
        return null;
      }

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción auto-categorizada correctamente'
      );
      return data;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal auto-categorizando transacción',
        error
      );
      return null;
    }
  }

  /**
   * Obtener transacciones frecuentes para quick actions
   */
  static async getFrequentTransactions(
    userId: string,
    limit: number = 5
  ): Promise<
    Array<{
      description: string;
      category_id: string;
      category_name: string;
      category_emoji: string;
      avg_amount: number;
      frequency: number;
    }>
  > {
    try {
      logger.database(
        LogModule.TRANSACTIONS,
        'Obteniendo transacciones frecuentes',
        {
          userId,
          limit,
        }
      );

      const { data, error } = await supabase
        .from('transactions')
        .select(
          'description, category_id, category_name, category_emoji, amount'
        )
        .eq('user_id', userId)
        .eq('type', 'expense')
        .is('deleted_at', null)
        .not('description', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100); // Últimas 100 transacciones

      if (error) {
        logger.error(
          LogModule.TRANSACTIONS,
          'Error obteniendo transacciones frecuentes',
          error
        );
        throw error;
      }

      // Agrupar por descripción y categoría
      const frequencyMap = new Map();

      (data || []).forEach((transaction) => {
        const key = `${transaction.description?.toLowerCase().trim()}_${
          transaction.category_id
        }`;

        if (frequencyMap.has(key)) {
          const existing = frequencyMap.get(key);
          existing.frequency += 1;
          existing.total_amount += transaction.amount || 0;
        } else {
          frequencyMap.set(key, {
            description: transaction.description,
            category_id: transaction.category_id,
            category_name: transaction.category_name,
            category_emoji: transaction.category_emoji,
            frequency: 1,
            total_amount: transaction.amount || 0,
          });
        }
      });

      // Calcular promedio y ordenar por frecuencia
      const frequent = Array.from(frequencyMap.values())
        .filter((item) => item.frequency >= 2) // Al menos 2 ocurrencias
        .map((item) => ({
          ...item,
          avg_amount:
            Math.round((item.total_amount / item.frequency) * 100) / 100,
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit);

      logger.success(
        LogModule.TRANSACTIONS,
        `${frequent.length} transacciones frecuentes obtenidas`
      );

      return frequent;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error fatal obteniendo transacciones frecuentes',
        error
      );
      throw error;
    }
  }
}
