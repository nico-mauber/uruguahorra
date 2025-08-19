import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

export class TransactionsService {
  /**
   * Obtener transacciones del usuario
   */
  static async getUserTransactions(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<unknown[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo transacciones del usuario', {
        userId,
        limit,
        offset,
      });

      const { data, error } = await supabase
        .from('transactions_raw')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo transacciones', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} transacciones obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal obteniendo transacciones', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de transacciones
   */
  static async getTransactionStats(userId: string): Promise<{
    byCategory: Record<string, { count: number; total: number }>;
  } | null> {
    try {
      logger.start(LogModule.DB, 'Obteniendo estadísticas de transacciones', {
        userId,
      });

      const { data, error } = await supabase
        .from('transactions_raw')
        .select('category, amount')
        .eq('user_id', userId);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo estadísticas de transacciones',
          error
        );
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const stats: Record<string, { count: number; total: number }> = {};

      data.forEach((transaction) => {
        const category = transaction.category || 'Sin categoría';
        if (!stats[category]) {
          stats[category] = { count: 0, total: 0 };
        }
        stats[category].count++;
        stats[category].total += Math.abs(transaction.amount);
      });

      logger.success(LogModule.DB, 'Estadísticas calculadas exitosamente', {
        categories: Object.keys(stats).length,
        totalTransactions: data.length,
      });

      return { byCategory: stats };
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal calculando estadísticas', error);
      throw error;
    }
  }

  /**
   * Eliminar transacción
   */
  static async deleteTransaction(
    userId: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      logger.start(LogModule.DB, 'Eliminando transacción', {
        userId,
        transactionId,
      });

      const { error } = await supabase
        .from('transactions_raw')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error eliminando transacción', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Transacción eliminada exitosamente');
      return true;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal eliminando transacción', error);
      throw error;
    }
  }

  /**
   * Obtener transacciones por categoría
   */
  static async getTransactionsByCategory(
    userId: string,
    category: string
  ): Promise<unknown[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo transacciones por categoría', {
        userId,
        category,
      });

      const { data, error } = await supabase
        .from('transactions_raw')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('transaction_date', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo transacciones por categoría',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} transacciones encontradas en categoría ${category}`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo transacciones por categoría',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener resumen de gastos por mes
   */
  static async getMonthlyExpenses(
    userId: string
  ): Promise<Record<string, number>> {
    try {
      logger.start(LogModule.DB, 'Obteniendo gastos mensuales', { userId });

      const { data, error } = await supabase
        .from('transactions_raw')
        .select('transaction_date, amount, category')
        .eq('user_id', userId)
        .lte('amount', 0) // Solo gastos (montos negativos)
        .order('transaction_date', { ascending: false });

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo gastos mensuales', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {};
      }

      // Agrupar por mes
      const monthlyData: Record<string, number> = {};

      data.forEach((transaction) => {
        const date = new Date(transaction.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }

        monthlyData[monthKey] += Math.abs(transaction.amount);
      });

      logger.success(LogModule.DB, 'Gastos mensuales calculados', {
        months: Object.keys(monthlyData).length,
      });

      return monthlyData;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo gastos mensuales',
        error
      );
      throw error;
    }
  }
}
