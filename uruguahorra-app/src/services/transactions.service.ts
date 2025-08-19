import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { ContributionsService } from './contributions.service';
import { categorize, getCategoryDisplayName } from '@/utils/categorizer';
import Papa from 'papaparse';

type TransactionRaw = Database['public']['Tables']['transactions_raw']['Row'];
type TransactionRawInsert =
  Database['public']['Tables']['transactions_raw']['Insert'];

interface CSVRow {
  date: string;
  description: string;
  amount: number;
  category?: string;
  account?: string;
}

interface ImportResult {
  totalProcessed: number;
  successfulImports: number;
  errors: string[];
  contributionsCreated: number;
}

export class TransactionsService {
  /**
   * Importar transacciones desde CSV
   */
  static async importCSV(
    userId: string,
    csvData: CSVRow[],
    goalId?: string
  ): Promise<ImportResult> {
    try {
      logger.start(LogModule.DB, 'Iniciando importación de CSV', {
        userId,
        rowCount: csvData.length,
        goalId,
      });

      const result: ImportResult = {
        totalProcessed: csvData.length,
        successfulImports: 0,
        errors: [],
        contributionsCreated: 0,
      };

      const transactionsToInsert: TransactionRawInsert[] = [];

      // Validar y procesar cada fila
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        try {
          // Validar datos requeridos
          if (!row.date) {
            throw new Error(`Fila ${i + 1}: Fecha requerida`);
          }

          if (!row.description) {
            throw new Error(`Fila ${i + 1}: Descripción requerida`);
          }

          if (isNaN(row.amount) || row.amount === 0) {
            throw new Error(`Fila ${i + 1}: Monto inválido`);
          }

          // Parsear fecha
          const transactionDate = new Date(row.date);
          if (isNaN(transactionDate.getTime())) {
            throw new Error(`Fila ${i + 1}: Fecha inválida (${row.date})`);
          }

          // Auto-categorizar si no hay categoría
          const finalCategory =
            row.category?.trim() ||
            getCategoryDisplayName(categorize(row.description));

          const transaction: TransactionRawInsert = {
            user_id: userId,
            transaction_date: transactionDate.toISOString(),
            description: row.description.trim(),
            amount: Math.abs(row.amount), // Tomar valor absoluto
            category: finalCategory,
            account: row.account?.trim() || null,
            imported_at: new Date().toISOString(),
          };

          transactionsToInsert.push(transaction);
          result.successfulImports++;
        } catch (error: unknown) {
          result.errors.push(error.message);
          logger.warn(LogModule.DB, 'Error procesando fila CSV', {
            rowIndex: i,
            error: error.message,
          });
        }
      }

      if (transactionsToInsert.length === 0) {
        throw new Error('No hay transacciones válidas para importar');
      }

      // Insertar transacciones en la base de datos
      const { data: insertedTransactions, error: insertError } = await supabase
        .from('transactions_raw')
        .insert(transactionsToInsert)
        .select();

      if (insertError) {
        logger.error(
          LogModule.DB,
          'Error insertando transacciones',
          insertError
        );
        throw insertError;
      }

      // Si se especifica un goalId, crear contribuciones automáticamente
      if (goalId && insertedTransactions) {
        try {
          const contributions = insertedTransactions.map((transaction) => ({
            user_id: userId,
            goal_id: goalId,
            amount: transaction.amount,
            source: 'automatic' as const,
            description: `Importado: ${transaction.description}`,
            created_at: transaction.transaction_date,
          }));

          const createdContributions =
            await ContributionsService.createBulkContributions(contributions);
          result.contributionsCreated = createdContributions.length;

          logger.success(
            LogModule.DB,
            'Contribuciones creadas desde transacciones importadas',
            {
              count: createdContributions.length,
            }
          );
        } catch (contributionError: unknown) {
          logger.error(
            LogModule.DB,
            'Error creando contribuciones automáticas',
            contributionError
          );
          result.errors.push(
            `Error creando contribuciones: ${contributionError.message}`
          );
        }
      }

      logger.success(LogModule.DB, 'Importación de CSV completada', result);
      return result;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal importando CSV', error);
      throw error;
    }
  }

  /**
   * Obtener transacciones importadas del usuario
   */
  static async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionRaw[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo transacciones del usuario', {
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
   * Obtener transacciones por período
   */
  static async getTransactionsByPeriod(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TransactionRaw[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo transacciones por período', {
        userId,
        startDate,
        endDate,
      });

      const { data, error } = await supabase
        .from('transactions_raw')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo transacciones por período',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} transacciones del período obtenidas`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo transacciones por período',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener estadísticas de transacciones
   */
  static async getTransactionStats(userId: string) {
    try {
      logger.database(
        LogModule.DB,
        'Calculando estadísticas de transacciones',
        { userId }
      );

      const { data, error } = await supabase
        .from('transactions_raw')
        .select('amount, category, transaction_date')
        .eq('user_id', userId);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo transacciones para estadísticas',
          error
        );
        throw error;
      }

      const transactions = data || [];

      // Calcular estadísticas básicas
      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const averageAmount =
        totalTransactions > 0 ? totalAmount / totalTransactions : 0;

      // Agrupar por categoría
      const byCategory = transactions.reduce(
        (acc, t) => {
          const category = t.category || 'Sin categoría';
          if (!acc[category]) {
            acc[category] = { count: 0, total: 0 };
          }
          acc[category].count++;
          acc[category].total += t.amount;
          return acc;
        },
        {} as Record<string, { count: number; total: number }>
      );

      // Agrupar por mes
      const byMonth = transactions.reduce(
        (acc, t) => {
          const month = t.transaction_date.substring(0, 7); // YYYY-MM
          if (!acc[month]) {
            acc[month] = { count: 0, total: 0 };
          }
          acc[month].count++;
          acc[month].total += t.amount;
          return acc;
        },
        {} as Record<string, { count: number; total: number }>
      );

      // Encontrar transacción más grande
      const largestTransaction =
        transactions.length > 0
          ? Math.max(...transactions.map((t) => t.amount))
          : 0;

      // Transacciones del mes actual
      const currentMonth = new Date().toISOString().substring(0, 7);
      const currentMonthStats = byMonth[currentMonth] || { count: 0, total: 0 };

      const stats = {
        totalTransactions,
        totalAmount,
        averageAmount,
        largestTransaction,
        currentMonthTransactions: currentMonthStats.count,
        currentMonthAmount: currentMonthStats.total,
        byCategory,
        byMonth,
        lastImport:
          transactions.length > 0 ? transactions[0].transaction_date : null,
      };

      logger.success(
        LogModule.DB,
        'Estadísticas de transacciones calculadas',
        stats
      );
      return stats;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error calculando estadísticas de transacciones',
        error
      );
      throw error;
    }
  }

  /**
   * Eliminar transacciones por rango de fechas
   */
  static async deleteTransactionsByPeriod(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      logger.warn(LogModule.DB, 'Eliminando transacciones por período', {
        userId,
        startDate,
        endDate,
      });

      const { data, error } = await supabase
        .from('transactions_raw')
        .delete()
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .select('id');

      if (error) {
        logger.error(LogModule.DB, 'Error eliminando transacciones', error);
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.success(LogModule.DB, `${deletedCount} transacciones eliminadas`);
      return deletedCount;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal eliminando transacciones', error);
      throw error;
    }
  }

  /**
   * Procesar texto CSV y convertir a array de objetos usando PapaParse
   */
  static parseCSV(csvText: string): CSVRow[] {
    try {
      logger.info(LogModule.PROCESSING, 'Parseando texto CSV con PapaParse');

      // Parsear CSV con PapaParse
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        trimHeaders: true,
        dynamicTyping: true,
      });

      if (parseResult.errors.length > 0) {
        logger.warn(
          LogModule.PROCESSING,
          'Errores en parsing CSV',
          parseResult.errors
        );
      }

      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error(
          'El archivo CSV está vacío o no contiene datos válidos'
        );
      }

      // Mapear nombres de columnas comunes
      const columnMap: Record<string, string> = {
        fecha: 'date',
        date: 'date',
        descripcion: 'description',
        description: 'description',
        concepto: 'description',
        detalle: 'description',
        monto: 'amount',
        amount: 'amount',
        importe: 'amount',
        valor: 'amount',
        categoria: 'category',
        category: 'category',
        cuenta: 'account',
        account: 'account',
      };

      // Procesar y mapear datos
      const rows: CSVRow[] = [];

      for (const rawRow of parseResult.data) {
        const row: Partial<CSVRow> = {};

        // Mapear columnas
        Object.keys(rawRow).forEach((key) => {
          const normalizedKey = key.toLowerCase().trim();
          const mappedKey = columnMap[normalizedKey] || normalizedKey;
          const value = rawRow[key];

          switch (mappedKey) {
            case 'date':
              if (value) {
                // Manejar diferentes formatos de fecha
                row.date = String(value);
              }
              break;
            case 'description':
              if (value) {
                row.description = String(value).trim();
              }
              break;
            case 'amount':
              if (value !== null && value !== undefined) {
                // Si es string, limpiar símbolos de moneda
                const cleanValue = String(value).replace(/[^\d.-]/g, '');
                const parsed = parseFloat(cleanValue);
                if (!isNaN(parsed)) {
                  row.amount = parsed;
                }
              }
              break;
            case 'category':
              if (value) {
                row.category = String(value).trim();
              }
              break;
            case 'account':
              if (value) {
                row.account = String(value).trim();
              }
              break;
          }
        });

        // Validar que tenga los campos requeridos
        if (
          row.date &&
          row.description &&
          typeof row.amount === 'number' &&
          !isNaN(row.amount)
        ) {
          // Auto-categorizar si no tiene categoría
          if (!row.category) {
            row.category = getCategoryDisplayName(categorize(row.description));
          }
          rows.push(row as CSVRow);
        }
      }

      if (rows.length === 0) {
        throw new Error(
          'No se encontraron transacciones válidas. Verifica que el CSV tenga columnas: fecha/date, descripcion/description, monto/amount'
        );
      }

      logger.success(
        LogModule.PROCESSING,
        `${rows.length} transacciones parseadas exitosamente de ${parseResult.data.length} filas`
      );

      return rows;
    } catch (error) {
      logger.error(LogModule.PROCESSING, 'Error parseando CSV', error);
      throw error;
    }
  }

  /**
   * Validar formato de archivo CSV
   */
  static validateCSVFormat(csvText: string): {
    isValid: boolean;
    errors: string[];
  } {
    try {
      const errors: string[] = [];

      if (!csvText || csvText.trim() === '') {
        errors.push('El archivo está vacío');
        return { isValid: false, errors };
      }

      // Intentar parsear con PapaParse
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        preview: 5, // Solo validar las primeras 5 filas para performance
      });

      // Recopilar errores de parsing
      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach((error) => {
          errors.push(`Línea ${error.row || 0}: ${error.message}`);
        });
      }

      // Validar que haya datos
      if (!parseResult.data || parseResult.data.length === 0) {
        errors.push('No se encontraron datos válidos en el archivo');
      }

      // Validar que tenga columnas requeridas
      if (parseResult.data && parseResult.data.length > 0) {
        const firstRow = parseResult.data[0];
        const headers = Object.keys(firstRow).map((h) => h.toLowerCase());

        const hasDate = headers.some((h) => ['fecha', 'date'].includes(h));
        const hasDescription = headers.some((h) =>
          ['descripcion', 'description', 'concepto', 'detalle'].includes(h)
        );
        const hasAmount = headers.some((h) =>
          ['monto', 'amount', 'importe', 'valor'].includes(h)
        );

        if (!hasDate) {
          errors.push('Falta columna de fecha (fecha/date)');
        }
        if (!hasDescription) {
          errors.push(
            'Falta columna de descripción (descripcion/description/concepto/detalle)'
          );
        }
        if (!hasAmount) {
          errors.push('Falta columna de monto (monto/amount/importe/valor)');
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error: unknown) {
      return {
        isValid: false,
        errors: [`Error validando archivo: ${error.message}`],
      };
    }
  }

  /**
   * Obtener resumen de importación antes de procesar
   */
  static previewCSVImport(csvText: string): {
    rowCount: number;
    sampleRows: CSVRow[];
    headers: string[];
    estimatedContributions: number;
    categoryDistribution: Record<string, number>;
  } {
    try {
      const rows = this.parseCSV(csvText);
      const parseResult = Papa.parse(csvText, {
        header: true,
        preview: 1,
      });

      const headers =
        parseResult.data.length > 0 ? Object.keys(parseResult.data[0]) : [];

      // Calcular distribución por categorías
      const categoryDistribution: Record<string, number> = {};
      rows.forEach((row) => {
        const category = row.category || 'Otros';
        categoryDistribution[category] =
          (categoryDistribution[category] || 0) + 1;
      });

      return {
        rowCount: rows.length,
        sampleRows: rows.slice(0, 5), // Primeras 5 filas como muestra
        headers,
        estimatedContributions: rows.filter((r) => r.amount > 0).length,
        categoryDistribution,
      };
    } catch (error) {
      logger.error(
        LogModule.PROCESSING,
        'Error generando vista previa de CSV',
        error
      );
      throw error;
    }
  }
}
