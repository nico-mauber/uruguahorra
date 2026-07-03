import { create } from 'zustand';
import { BudgetsService, type CreateBudgetInput } from '@/services/BudgetsService';
import { logger, LogModule } from '@/lib/logger';
import type { BudgetRow } from '@/types/database';

/**
 * Store de presupuestos. Modelo local camelCase; conversión BD→local en `toBudget`.
 * Fuente: docs/features/budgets/budgets-functional-specs.md.
 */
export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired';
  categoryName: string | null;
  categoryEmoji: string | null;
  categoryColor: string | null;
}

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    amount: row.amount,
    spent: row.spent,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    categoryName: row.category?.name ?? null,
    categoryEmoji: row.category?.emoji ?? null,
    categoryColor: row.category?.color ?? null,
  };
}

/** Hoy en formato YYYY-MM-DD (local). */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA'); // en-CA => YYYY-MM-DD in local time
}

/** Un presupuesto activo está "vencido" si su end_date ya pasó. */
export function isExpired(b: Budget): boolean {
  return b.endDate < todayIso();
}

/** Un presupuesto está vigente si hoy está dentro de [startDate, endDate]. */
export function isVigente(b: Budget): boolean {
  const today = todayIso();
  return b.startDate <= today && today <= b.endDate;
}

interface BudgetsState {
  active: Budget[];
  history: Budget[];
  isLoading: boolean;
  error: string | null;
  fetchActive: (userId: string) => Promise<void>;
  fetchHistory: (userId: string) => Promise<void>;
  create: (userId: string, input: CreateBudgetInput) => Promise<void>;
  renew: (userId: string, expiredId: string, input: CreateBudgetInput) => Promise<void>;
  getActiveForCategory: (categoryId: string) => Budget | null;
  clearStore: () => void;
}

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  active: [],
  history: [],
  isLoading: false,
  error: null,

  fetchActive: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await BudgetsService.fetchActive(userId);
      set({ active: rows.map(toBudget), isLoading: false });
    } catch (error) {
      logger.error(LogModule.BUDGETS, 'Error cargando presupuestos activos', error);
      set({ isLoading: false, error: 'No se pudieron cargar los presupuestos' });
    }
  },

  fetchHistory: async (userId) => {
    try {
      const rows = await BudgetsService.fetchHistory(userId);
      set({ history: rows.map(toBudget) });
    } catch (error) {
      logger.error(LogModule.BUDGETS, 'Error cargando historial', error);
    }
  },

  create: async (userId, input) => {
    try {
      await BudgetsService.create(userId, input);
    } catch (error) {
      set({ error: 'No se pudo crear el presupuesto' });
      throw error;
    }
    await get().fetchActive(userId);
  },

  renew: async (userId, expiredId, input) => {
    try {
      await BudgetsService.renew(userId, expiredId, input);
    } catch (error) {
      set({ error: 'No se pudo renovar el presupuesto' });
      throw error;
    }
    await Promise.all([get().fetchActive(userId), get().fetchHistory(userId)]);
  },

  getActiveForCategory: (categoryId) =>
    get().active.find((b) => b.categoryId === categoryId && b.status === 'active') ?? null,

  clearStore: () => set({ active: [], history: [], isLoading: false, error: null }),
}));
