import { create } from 'zustand';
import { GoalsService } from '@/services/GoalsService';
import { logger, LogModule } from '@/lib/logger';
import type { GoalRow } from '@/types/database';

/**
 * Store de metas. Fuente: docs/architecture/state-management §2.2.
 * Modelo local en camelCase; conversión BD→local en `toGoal`.
 */
export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  category: string;
  color: string;
  icon: string;
  goalTypeId: string | null;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: row.target_amount,
    // saved_amount y current_amount son equivalentes (trigger); usar saved_amount.
    savedAmount: row.saved_amount ?? row.current_amount ?? 0,
    targetDate: row.target_date ?? row.deadline,
    category: row.category,
    color: row.color,
    icon: row.icon,
    goalTypeId: row.goal_type_id,
    isActive: row.is_active,
    isCompleted: row.is_completed,
    createdAt: row.created_at,
  };
}

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  lastFetchUserId: string | null;

  fetchGoals: (userId: string, force?: boolean) => Promise<void>;
  addContributionLocal: (goalId: string, amount: number) => void;
  getTotalSaved: () => number;
  getGoalProgress: (goalId: string) => number;
  clearStore: () => void;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,
  lastFetchUserId: null,

  fetchGoals: async (userId, force = false) => {
    const { isLoading, lastFetchUserId } = get();
    // Dedup: no refetch si ya cargamos este usuario y no es forzado.
    if (isLoading) return;
    if (!force && lastFetchUserId === userId && get().goals.length >= 0 && lastFetchUserId !== null) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const rows = await GoalsService.fetchGoals(userId);
      set({
        goals: rows.map(toGoal),
        lastFetchUserId: userId,
        isLoading: false,
      });
    } catch (error) {
      logger.error(LogModule.GOALS, 'Error cargando metas', error);
      set({ isLoading: false, error: 'No se pudieron cargar las metas' });
    }
  },

  // Actualización optimista local (el trigger de BD ya recalculó en el server).
  addContributionLocal: (goalId, amount) => {
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const savedAmount = g.savedAmount + amount;
        return {
          ...g,
          savedAmount,
          isCompleted: g.isCompleted || savedAmount >= g.targetAmount,
        };
      }),
    }));
  },

  getTotalSaved: () => get().goals.reduce((sum, g) => sum + g.savedAmount, 0),

  getGoalProgress: (goalId) => {
    const g = get().goals.find((x) => x.id === goalId);
    if (!g || g.targetAmount <= 0) return 0;
    return Math.min(100, (g.savedAmount / g.targetAmount) * 100);
  },

  clearStore: () =>
    set({ goals: [], isLoading: false, error: null, lastFetchUserId: null }),
}));
