import { create } from 'zustand';
import { TransactionsService } from '@/services/TransactionsService';
import { logger, LogModule } from '@/lib/logger';
import { cacheGetByUser, cachePut } from '@/lib/idb';
import type {
  FrequentTransaction,
  TransactionCategoryRow,
  TransactionRow,
} from '@/types/database';

/**
 * Store de transacciones. Fuente: docs/architecture/state-management §2.3.
 * Modelo local en camelCase; conversión BD→local en `toTransaction`.
 * Los campos de categoría provienen del objeto anidado `category` del join, o
 * de los campos propios de la fila (`category_name`/`category_emoji`) como
 * fallback.
 */
export interface Transaction {
  id: string;
  userId: string;
  goalId: string | null;
  amount: number;
  description: string | null;
  notes: string | null;
  transactionDate: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  categoryColor: string | null;
  type: 'expense' | 'income' | 'transfer';
  xpEarned: number;
  createdAt: string;
}

function toTransaction(row: TransactionRow): Transaction {
  const joined = row.category ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    amount: row.amount,
    description: row.description,
    notes: row.notes,
    transactionDate: row.transaction_date,
    categoryId: row.category_id,
    categoryName: joined?.name ?? row.category_name,
    categoryEmoji: joined?.emoji ?? row.category_emoji,
    categoryColor: joined?.color ?? null,
    type: row.type,
    xpEarned: row.xp_earned,
    createdAt: row.created_at,
  };
}

interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

interface TransactionsState {
  transactions: Transaction[];
  categories: TransactionCategoryRow[];
  frequent: FrequentTransaction[];
  isLoading: boolean;
  error: string | null;
  range: DateRange;

  fetchCategories: () => Promise<void>;
  fetchTransactions: (
    userId: string,
    opts?: { startDate?: string; endDate?: string; force?: boolean }
  ) => Promise<void>;
  createQuick: (
    userId: string,
    input: {
      amount: number;
      category_id?: string | null;
      description?: string;
      type: 'expense' | 'income' | 'transfer';
      budget_id?: string | null;
    }
  ) => Promise<void>;
  remove: (id: string, userId: string) => Promise<void>;
  fetchFrequent: (userId: string) => Promise<void>;
  getBalance: () => { income: number; expenses: number; balance: number };
  clearStore: () => void;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  categories: [],
  frequent: [],
  isLoading: false,
  error: null,
  range: { startDate: null, endDate: null },

  fetchCategories: async () => {
    // Dedup: las categorías son casi estáticas; no recargar si ya están.
    // TODO: cachear en IndexedDB `cache-categories` con TTL 24h (fase posterior).
    //       Por ahora sólo caché en memoria.
    if (get().categories.length > 0) return;
    try {
      const rows = await TransactionsService.fetchCategories();
      set({ categories: rows });
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error cargando categorías', error);
      set({ error: 'No se pudieron cargar las categorías' });
    }
  },

  fetchTransactions: async (userId, opts = {}) => {
    const { force = false, startDate, endDate } = opts;
    // Dedup: no reentrada si ya hay un fetch en curso.
    if (get().isLoading && !force) return;

    set({
      isLoading: true,
      error: null,
      range: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
    });
    // Cache-then-network: hidratar desde IndexedDB (§4.1). Filtra soft-deleted
    // por si la fila quedó en caché de una sesión anterior a la purga en delete.
    if (get().transactions.length === 0) {
      try {
        const cached = await cacheGetByUser('cache-transactions', userId);
        const fresh = (cached as unknown as TransactionRow[]).filter((r) => !r.deleted_at);
        if (fresh.length > 0) set({ transactions: fresh.map(toTransaction) });
      } catch { /* caché opcional */ }
    }

    try {
      const rows = await TransactionsService.getUserTransactions({
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        offset: 0,
        limit: 1000,
      });
      set({ transactions: rows.map(toTransaction), isLoading: false });
      // Persistir últimas transacciones para lecturas offline (§4).
      void cachePut('cache-transactions', rows as unknown as Record<string, unknown>[]);
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error cargando transacciones', error);
      set((s) => ({ isLoading: false, error: s.transactions.length === 0 ? 'No se pudieron cargar las transacciones' : null }));
    }
  },

  createQuick: async (userId, input) => {
    try {
      await TransactionsService.createQuickTransaction(userId, input);
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error creando transacción', error);
      set({ error: 'No se pudo crear la transacción' });
      throw error;
    }
    // Refetch del rango vigente (force para saltar el guard de reentrada).
    const { startDate, endDate } = get().range;
    await get().fetchTransactions(userId, {
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      force: true,
    });
  },

  remove: async (id, userId) => {
    try {
      await TransactionsService.deleteTransaction(id);
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error eliminando transacción', error);
      set({ error: 'No se pudo eliminar la transacción' });
      throw error;
    }
    const { startDate, endDate } = get().range;
    await get().fetchTransactions(userId, {
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      force: true,
    });
  },

  fetchFrequent: async (userId) => {
    try {
      const frequent = await TransactionsService.getFrequentTransactions(userId, 5);
      set({ frequent });
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error cargando transacciones frecuentes',
        error
      );
    }
  },

  getBalance: () => {
    const { transactions } = get();
    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expenses += t.amount;
    }
    return { income, expenses, balance: income - expenses };
  },

  clearStore: () =>
    set({
      transactions: [],
      categories: [],
      frequent: [],
      isLoading: false,
      error: null,
      range: { startDate: null, endDate: null },
    }),
}));
