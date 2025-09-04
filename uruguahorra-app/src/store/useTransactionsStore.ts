import { create } from 'zustand';
import { TransactionsService } from '@/services/transactions.service';
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
import { cacheManager } from '@/services/cache-manager.service';

interface TransactionsStore {
  // Estado
  transactions: Transaction[];
  categories: TransactionCategory[];
  frequentCategories: TransactionCategory[];
  frequentTransactions: Array<{
    description: string;
    category_id: string;
    category_name: string;
    category_emoji: string;
    avg_amount: number;
    frequency: number;
  }>;
  currentBalance: {
    income: number;
    expenses: number;
    balance: number;
    period: { start: string; end: string };
  } | null;
  spendingInsights: SpendingInsight | null;

  // Estados de UI
  isLoading: boolean;
  isLoadingMore: boolean;
  isSyncing: boolean;
  error: string | null;
  hasMore: boolean;

  // Filtros y paginación
  currentFilters: TransactionFilters | null;
  totalTransactions: number;
  lastFetchUserId: string | null;

  // Cache timestamps para invalidación
  lastCategoriesFetch: number | null;
  lastBalanceFetch: number | null;
  lastInsightsFetch: number | null;

  // ============================================
  // ACCIONES CORE
  // ============================================

  /**
   * Obtener transacciones con filtros y paginación
   */
  fetchTransactions: (
    filters: TransactionFilters,
    reset?: boolean
  ) => Promise<void>;

  /**
   * Obtener más transacciones (paginación infinita)
   */
  loadMoreTransactions: () => Promise<void>;

  /**
   * Crear transacción rápida (3-tap)
   */
  createQuickTransaction: (
    userId: string,
    transaction: QuickTransaction
  ) => Promise<Transaction>;

  /**
   * Crear transacción completa
   */
  createTransaction: (
    userId: string,
    transaction: TransactionInsert
  ) => Promise<Transaction>;

  /**
   * Actualizar transacción (optimistic)
   */
  updateTransaction: (
    id: string,
    userId: string,
    updates: TransactionUpdate
  ) => Promise<void>;

  /**
   * Eliminar transacción (optimistic)
   */
  deleteTransaction: (id: string, userId: string) => Promise<void>;

  // ============================================
  // CATEGORÍAS
  // ============================================

  /**
   * Cargar categorías (con cache)
   */
  fetchCategories: (force?: boolean) => Promise<void>;

  /**
   * Obtener categorías por tipo
   */
  getCategoriesByType: (
    type: 'expense' | 'income' | 'transfer'
  ) => TransactionCategory[];

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Obtener balance actual
   */
  fetchCurrentBalance: (userId: string, force?: boolean) => Promise<void>;

  /**
   * Obtener balance actual (alias)
   */
  getCurrentBalance: (userId: string, force?: boolean) => Promise<void>;

  /**
   * Obtener insights psicológicos
   */
  fetchSpendingInsights: (
    userId: string,
    daysBack?: number,
    force?: boolean
  ) => Promise<void>;

  /**
   * Obtener transacciones frecuentes
   */
  fetchFrequentTransactions: (userId: string, force?: boolean) => Promise<void>;

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Limpiar store (logout)
   */
  reset: () => void;

  /**
   * Obtener transacción por ID
   */
  getTransactionById: (id: string) => Transaction | null;

  /**
   * Buscar transacciones en cache
   */
  searchTransactions: (query: string) => Transaction[];

  /**
   * Obtener estadísticas rápidas
   */
  getQuickStats: () => {
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
    avgTransactionAmount: number;
  };

  /**
   * Limpiar cache de analytics para forzar refresh
   */
  clearAnalyticsCache: () => void;

  /**
   * Calcular balance basado en transacciones cargadas
   */
  calculateBalanceFromTransactions: (
    startDate: Date,
    endDate: Date
  ) => {
    income: number;
    expenses: number;
    balance: number;
    period: { start: string; end: string };
  };
}

export const useTransactionsStore = create<TransactionsStore>((set, get) => ({
  // Estado inicial
  transactions: [],
  categories: [],
  frequentCategories: [],
  frequentTransactions: [],
  currentBalance: null,
  spendingInsights: null,

  // Estados de UI
  isLoading: false,
  isLoadingMore: false,
  isSyncing: false,
  error: null,
  hasMore: true,

  // Filtros y paginación
  currentFilters: null,
  totalTransactions: 0,
  lastFetchUserId: null,

  // Cache timestamps
  lastCategoriesFetch: null,
  lastBalanceFetch: null,
  lastInsightsFetch: null,

  // ============================================
  // IMPLEMENTACIÓN DE ACCIONES
  // ============================================

  fetchTransactions: async (filters: TransactionFilters, reset = false) => {
    try {
      const { isLoading, isLoadingMore } = get();

      // Evitar requests duplicados
      if (isLoading || isLoadingMore) {
        logger.warn(
          LogModule.TRANSACTIONS,
          'Request en progreso, saltando fetch'
        );
        return;
      }

      set({
        isLoading: reset,
        isLoadingMore: !reset,
        error: null,
      });

      logger.start(LogModule.TRANSACTIONS, 'Obteniendo transacciones', {
        filters,
        reset,
      });

      const result = await TransactionsService.getUserTransactions(filters);

      set((state) => ({
        transactions: reset
          ? result.transactions
          : [...state.transactions, ...result.transactions],
        totalTransactions: result.total,
        currentFilters: filters,
        lastFetchUserId: filters.user_id,
        hasMore: filters.offset + filters.limit < result.total,
        isLoading: false,
        isLoadingMore: false,
      }));

      logger.success(
        LogModule.TRANSACTIONS,
        `${result.transactions.length} transacciones cargadas`
      );
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error obteniendo transacciones',
        error
      );
      set({
        error: 'Error cargando transacciones',
        isLoading: false,
        isLoadingMore: false,
      });
    }
  },

  loadMoreTransactions: async () => {
    const { currentFilters, hasMore, transactions } = get();

    if (!currentFilters || !hasMore) {
      logger.warn(
        LogModule.TRANSACTIONS,
        'No hay más transacciones para cargar'
      );
      return;
    }

    const nextFilters = {
      ...currentFilters,
      offset: transactions.length,
    };

    await get().fetchTransactions(nextFilters, false);
  },

  createQuickTransaction: async (
    userId: string,
    transaction: QuickTransaction
  ) => {
    try {
      set({ isSyncing: true, error: null });

      logger.start(
        LogModule.TRANSACTIONS,
        'Creando transacción rápida',
        transaction
      );

      const newTransaction = await TransactionsService.createQuickTransaction(
        userId,
        transaction
      );

      // Optimistic update
      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
        isSyncing: false,
      }));

      // Limpiar cache de analytics completamente
      get().clearAnalyticsCache();

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción rápida creada correctamente'
      );
      return newTransaction;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error creando transacción rápida',
        error
      );
      set({
        error: 'Error creando transacción',
        isSyncing: false,
      });
      throw error;
    }
  },

  createTransaction: async (userId: string, transaction: TransactionInsert) => {
    try {
      set({ isSyncing: true, error: null });

      logger.start(
        LogModule.TRANSACTIONS,
        'Creando transacción completa',
        transaction
      );

      const newTransaction = await TransactionsService.createTransaction(
        userId,
        transaction
      );

      // Optimistic update
      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
        isSyncing: false,
      }));

      // Limpiar cache de analytics completamente
      get().clearAnalyticsCache();

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción creada correctamente'
      );
      return newTransaction;
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error creando transacción', error);
      set({
        error: 'Error creando transacción',
        isSyncing: false,
      });
      throw error;
    }
  },

  updateTransaction: async (
    id: string,
    userId: string,
    updates: TransactionUpdate
  ) => {
    // Obtener transacción actual antes del optimistic update
    const state = get();
    const oldTransaction = state.transactions.find((t) => t.id === id);

    try {
      set({ isSyncing: true, error: null });

      // Optimistic update
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));

      logger.start(LogModule.TRANSACTIONS, 'Actualizando transacción', {
        id,
        updates,
      });

      const updatedTransaction = await TransactionsService.updateTransaction(
        id,
        userId,
        updates
      );

      // Actualizar con datos reales del servidor
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? updatedTransaction : t
        ),
        isSyncing: false,
      }));

      // Limpiar cache de analytics completamente
      get().clearAnalyticsCache();

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción actualizada correctamente'
      );
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error actualizando transacción',
        error
      );

      // Revertir optimistic update
      if (oldTransaction) {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? oldTransaction : t
          ),
        }));
      }

      set({
        error: 'Error actualizando transacción',
        isSyncing: false,
      });
      throw error;
    }
  },

  deleteTransaction: async (id: string, userId: string) => {
    // Obtener transacción antes del optimistic update
    const state = get();
    const transactionToDelete = state.transactions.find((t) => t.id === id);

    try {
      set({ isSyncing: true, error: null });

      // Optimistic update
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));

      logger.start(LogModule.TRANSACTIONS, 'Eliminando transacción', { id });

      await TransactionsService.deleteTransaction(id, userId);

      set({ isSyncing: false });

      // Limpiar cache de analytics completamente para forzar refresh
      get().clearAnalyticsCache();

      logger.success(
        LogModule.TRANSACTIONS,
        'Transacción eliminada correctamente'
      );
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error eliminando transacción',
        error
      );

      // Revertir optimistic update
      if (transactionToDelete) {
        set((state) => ({
          transactions: [transactionToDelete, ...state.transactions],
        }));
      }

      set({
        error: 'Error eliminando transacción',
        isSyncing: false,
      });
      throw error;
    }
  },

  // ============================================
  // CATEGORÍAS
  // ============================================

  fetchCategories: async (force = false) => {
    const { lastCategoriesFetch, categories } = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    // Usar cache si no es forzado y tenemos datos frescos
    if (
      !force &&
      lastCategoriesFetch &&
      now - lastCategoriesFetch < CACHE_DURATION &&
      categories.length > 0
    ) {
      logger.info(LogModule.TRANSACTIONS, 'Usando categorías desde cache');
      return;
    }

    try {
      set({ isLoading: true, error: null });

      logger.start(LogModule.TRANSACTIONS, 'Obteniendo categorías');

      const fetchedCategories = await TransactionsService.getCategories();

      // Calcular categorías frecuentes (las más usadas)
      const frequentCategories = fetchedCategories
        .filter((cat) => cat.type === 'expense') // Solo gastos para el FAB
        .slice(0, 3); // Top 3 por defecto

      set({
        categories: fetchedCategories,
        frequentCategories,
        lastCategoriesFetch: now,
        isLoading: false,
      });

      logger.success(
        LogModule.TRANSACTIONS,
        `${fetchedCategories.length} categorías cargadas`
      );
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error obteniendo categorías',
        error
      );
      set({
        error: 'Error cargando categorías',
        isLoading: false,
      });
    }
  },

  getCategoriesByType: (type: 'expense' | 'income' | 'transfer') => {
    return get().categories.filter((cat) => cat.type === type);
  },

  // ============================================
  // ANALYTICS
  // ============================================

  fetchCurrentBalance: async (userId: string, force = false) => {
    const { lastBalanceFetch } = get();
    const now = Date.now();
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

    if (!force && lastBalanceFetch && now - lastBalanceFetch < CACHE_DURATION) {
      logger.info(LogModule.TRANSACTIONS, 'Usando balance desde cache');
      return;
    }

    try {
      set({ isLoading: true, error: null });

      logger.start(LogModule.TRANSACTIONS, 'Obteniendo balance actual');

      const balance = await TransactionsService.getCurrentBalance(userId);

      set({
        currentBalance: balance,
        lastBalanceFetch: now,
        isLoading: false,
      });

      logger.success(LogModule.TRANSACTIONS, 'Balance obtenido correctamente');
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error obteniendo balance', error);
      set({
        error: 'Error cargando balance',
        isLoading: false,
      });
    }
  },

  // Alias para getCurrentBalance
  getCurrentBalance: async (userId: string, force = false) => {
    return get().fetchCurrentBalance(userId, force);
  },

  fetchSpendingInsights: async (
    userId: string,
    daysBack = 30,
    force = false
  ) => {
    const { lastInsightsFetch } = get();
    const now = Date.now();
    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

    if (
      !force &&
      lastInsightsFetch &&
      now - lastInsightsFetch < CACHE_DURATION
    ) {
      logger.info(LogModule.TRANSACTIONS, 'Usando insights desde cache');
      return;
    }

    try {
      set({ isLoading: true, error: null });

      logger.start(LogModule.TRANSACTIONS, 'Obteniendo insights de gastos');

      const insights = await TransactionsService.getSpendingInsights(
        userId,
        daysBack
      );

      set({
        spendingInsights: insights,
        lastInsightsFetch: now,
        isLoading: false,
      });

      logger.success(
        LogModule.TRANSACTIONS,
        'Insights obtenidos correctamente'
      );
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error obteniendo insights', error);
      set({
        error: 'Error cargando insights',
        isLoading: false,
      });
    }
  },

  fetchFrequentTransactions: async (userId: string, force = false) => {
    const { frequentTransactions } = get();

    if (!force && frequentTransactions.length > 0) {
      logger.info(
        LogModule.TRANSACTIONS,
        'Usando transacciones frecuentes desde cache'
      );
      return;
    }

    try {
      set({ isLoading: true, error: null });

      logger.start(
        LogModule.TRANSACTIONS,
        'Obteniendo transacciones frecuentes'
      );

      const frequent =
        await TransactionsService.getFrequentTransactions(userId);

      set({
        frequentTransactions: frequent,
        isLoading: false,
      });

      logger.success(
        LogModule.TRANSACTIONS,
        `${frequent.length} transacciones frecuentes cargadas`
      );
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error obteniendo transacciones frecuentes',
        error
      );
      set({
        error: 'Error cargando transacciones frecuentes',
        isLoading: false,
      });
    }
  },

  // ============================================
  // UTILIDADES
  // ============================================

  reset: () => {
    logger.info(LogModule.TRANSACTIONS, 'Reseteando store de transacciones');
    set({
      transactions: [],
      categories: [],
      frequentTransactions: [],
      currentBalance: null,
      spendingInsights: null,
      isLoading: false,
      isLoadingMore: false,
      isSyncing: false,
      error: null,
      hasMore: true,
      currentFilters: null,
      totalTransactions: 0,
      lastFetchUserId: null,
      lastCategoriesFetch: null,
      lastBalanceFetch: null,
      lastInsightsFetch: null,
    });
  },

  getTransactionById: (id: string) => {
    return get().transactions.find((t) => t.id === id) || null;
  },

  searchTransactions: (query: string) => {
    const { transactions } = get();
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) return transactions;

    return transactions.filter(
      (transaction) =>
        transaction.description?.toLowerCase().includes(searchTerm) ||
        transaction.notes?.toLowerCase().includes(searchTerm) ||
        transaction.location?.toLowerCase().includes(searchTerm) ||
        transaction.category_name?.toLowerCase().includes(searchTerm) ||
        transaction.tags?.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  },

  getQuickStats: () => {
    const { transactions } = get();

    let totalExpenses = 0;
    let totalIncome = 0;
    let expenseCount = 0;

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        totalExpenses += t.amount || 0;
        expenseCount++;
      } else if (t.type === 'income') {
        totalIncome += t.amount || 0;
      }
    });

    return {
      totalExpenses,
      totalIncome,
      transactionCount: transactions.length,
      avgTransactionAmount: expenseCount > 0 ? totalExpenses / expenseCount : 0,
    };
  },

  clearAnalyticsCache: () => {
    logger.info(
      LogModule.TRANSACTIONS,
      'Limpiando cache de analytics y notificando cross-store invalidation'
    );
    set({
      lastBalanceFetch: null,
      lastInsightsFetch: null,
      spendingInsights: null,
      currentBalance: null,
    });

    // Notify all analytics hooks and components to invalidate their cache
    cacheManager.invalidateAnalyticsCache();
  },

  calculateBalanceFromTransactions: (startDate: Date, endDate: Date) => {
    const { transactions } = get();

    if (transactions.length === 0) {
      return {
        income: 0,
        expenses: 0,
        balance: 0,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
      };
    }

    // Convertir fechas a strings para comparación
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Filtrar transacciones por rango de fechas
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate =
        transaction.transaction_date || transaction.created_at?.split('T')[0];

      if (!transactionDate) return false;
      return transactionDate >= startDateStr && transactionDate <= endDateStr;
    });

    // Calcular totales
    let income = 0;
    let expenses = 0;

    filteredTransactions.forEach((transaction) => {
      const amount = Number(transaction.amount) || 0;

      if (amount > 0) {
        if (transaction.type === 'income') {
          income += amount;
        } else if (transaction.type === 'expense') {
          expenses += amount;
        }
      }
    });

    const balance = income - expenses;

    logger.info(
      LogModule.TRANSACTIONS,
      `Balance calculado dinámicamente - Rango: ${startDateStr} a ${endDateStr}`,
      {
        income,
        expenses,
        balance,
        transactionsTotal: transactions.length,
        transactionsFiltered: filteredTransactions.length,
        startDate: startDateStr,
        endDate: endDateStr,
      }
    );

    return {
      income,
      expenses,
      balance,
      period: { start: startDateStr, end: endDateStr },
    };
  },
}));
