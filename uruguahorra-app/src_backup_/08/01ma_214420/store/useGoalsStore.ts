import { create } from 'zustand';
import { GoalsService } from '@/services/goals.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type DBGoal = Database['public']['Tables']['goals']['Row'];

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  createdAt: string;
  category?: 'emergency' | 'travel' | 'debt' | 'purchase';
  isActive?: boolean;
}

interface Contribution {
  id: string;
  goalId: string;
  amount: number;
  source: 'manual' | 'roundup' | 'automatic' | 'challenge_reward';
  createdAt: string;
}

interface GoalsStore {
  goals: Goal[];
  contributions: Contribution[];
  activeGoalId: string | null;
  isLoading: boolean;
  error: string | null;
  lastFetchUserId: string | null; // Para rastrear el último usuario cargado

  // Acciones para metas
  fetchGoals: (userId: string, force?: boolean) => Promise<void>;
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'savedAmount' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string | null) => void;

  // Acciones para contribuciones
  addContribution: (
    goalId: string,
    amount: number,
    source: 'manual' | 'roundup' | 'automatic' | 'challenge_reward'
  ) => void;
  fetchContributions: (goalId: string) => Promise<void>;

  // Utilidades
  getTotalSaved: () => number;
  getGoalProgress: (goalId: string) => number;
  clearStore: () => void;
}

// Función helper para convertir de DB a formato local
const convertDBGoalToLocal = (dbGoal: DBGoal): Goal => ({
  id: dbGoal.id,
  name: dbGoal.name,
  targetAmount: dbGoal.target_amount,
  savedAmount: dbGoal.saved_amount,
  targetDate: dbGoal.target_date,
  createdAt: dbGoal.created_at,
  isActive: dbGoal.is_active,
});

export const useGoalsStore = create<GoalsStore>((set, get) => ({
  goals: [],
  contributions: [],
  activeGoalId: null,
  isLoading: false,
  error: null,
  lastFetchUserId: null,

  fetchGoals: async (userId: string, force: boolean = false) => {
    logger.debug(LogModule.CACHE, 'fetchGoals llamado', { userId, force });

    // Verificar si ya estamos cargando
    const currentState = get();
    if (currentState.isLoading) {
      logger.warn(
        LogModule.CACHE,
        'Ya se están cargando las metas, evitando llamada duplicada'
      );
      return;
    }

    // Si no es forzado, verificar si ya cargamos las metas para este usuario
    if (!force && currentState.lastFetchUserId === userId) {
      logger.info(
        LogModule.CACHE,
        'Cache hit - Usando metas almacenadas para el usuario'
      );
      return;
    }

    logger.loading(LogModule.STORE, 'Cargando metas desde Supabase');
    set({ isLoading: true, error: null });

    try {
      // Obtener TODAS las metas del usuario (activas e inactivas)
      const goals = await GoalsService.getUserGoals(userId);
      logger.success(
        LogModule.STORE,
        `${goals.length} metas obtenidas de Supabase`,
        {
          metas: goals.map((g) => ({
            id: g.id,
            name: g.name,
            is_active: g.is_active,
            saved: g.saved_amount,
            target: g.target_amount,
          })),
        }
      );

      // Convertir al formato del store
      const localGoals = goals.map(convertDBGoalToLocal);

      set({
        goals: localGoals,
        isLoading: false,
        error: null,
        lastFetchUserId: userId, // Guardar el ID del último usuario cargado
      });

      logger.success(LogModule.STORE, 'Store de metas actualizado', {
        totalGoals: localGoals.length,
        userId,
      });
    } catch (error: unknown) {
      logger.error(LogModule.STORE, 'Error cargando metas', error);
      set({
        isLoading: false,
        error: error.message || 'Error al cargar las metas',
      });
    }
  },

  setGoals: (goals) => {
    logger.debug(
      LogModule.STORE,
      `setGoals: actualizando ${goals.length} metas`
    );
    set({ goals });
  },

  addGoal: (goalData) => {
    logger.info(LogModule.STORE, 'Agregando meta localmente', goalData);
    set((state) => ({
      goals: [
        ...state.goals,
        {
          ...goalData,
          id: Date.now().toString(),
          savedAmount: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal
      ),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== id),
      contributions: state.contributions.filter((c) => c.goalId !== id),
      activeGoalId: state.activeGoalId === id ? null : state.activeGoalId,
    })),

  setActiveGoal: (id) => set({ activeGoalId: id }),

  addContribution: async (goalId, amount, source) => {
    logger.start(LogModule.STORE, 'Agregando contribución', {
      goalId,
      amount,
      source,
    });

    try {
      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        logger.error(
          LogModule.AUTH,
          'No hay usuario autenticado para agregar contribución'
        );
        return;
      }

      // Crear contribución en Supabase
      const contribution = await GoalsService.addContribution({
        user_id: user.id,
        goal_id: goalId,
        amount,
        source,
      });

      logger.success(
        LogModule.STORE,
        'Contribución creada y agregada al store',
        {
          contributionId: contribution.id,
          amount: contribution.amount,
        }
      );

      // Actualizar el store local
      set((state) => {
        const newContribution: Contribution = {
          id: contribution.id,
          goalId: contribution.goal_id,
          amount: contribution.amount,
          source: contribution.source,
          createdAt: contribution.created_at,
        };

        return {
          contributions: [...state.contributions, newContribution],
          goals: state.goals.map((goal) =>
            goal.id === goalId
              ? { ...goal, savedAmount: goal.savedAmount + amount }
              : goal
          ),
        };
      });
    } catch (error) {
      logger.error(LogModule.STORE, 'Error agregando contribución', error);
      set({ error: 'Error al agregar contribución' });
    }
  },

  fetchContributions: async (goalId: string) => {
    try {
      const contributions = await GoalsService.getGoalContributions(goalId);

      const localContributions: Contribution[] = contributions.map((c) => ({
        id: c.id,
        goalId: c.goal_id,
        amount: c.amount,
        source: c.source,
        createdAt: c.created_at,
      }));

      set((state) => ({
        contributions: [
          ...state.contributions.filter((c) => c.goalId !== goalId),
          ...localContributions,
        ],
      }));
    } catch (error) {
      console.error('Error cargando contribuciones:', error);
    }
  },

  getTotalSaved: () => {
    const state = get();
    return state.goals.reduce((total, goal) => total + goal.savedAmount, 0);
  },

  getGoalProgress: (goalId) => {
    const state = get();
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return 0;
    return Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  },

  clearStore: () => {
    logger.info(LogModule.STORE, 'Limpiando store de metas completamente');
    set({
      goals: [],
      contributions: [],
      activeGoalId: null,
      isLoading: false,
      error: null,
      lastFetchUserId: null, // Limpiar también el último usuario cargado
    });
  },
}));
