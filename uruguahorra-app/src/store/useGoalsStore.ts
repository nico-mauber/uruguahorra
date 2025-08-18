import { create } from 'zustand';
import { GoalsService } from '@/services/goals.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

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
  
  // Acciones para metas
  fetchGoals: (userId: string) => Promise<void>;
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'savedAmount' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string | null) => void;
  
  // Acciones para contribuciones
  addContribution: (goalId: string, amount: number, source: 'manual' | 'roundup' | 'automatic' | 'challenge_reward') => void;
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
  
  fetchGoals: async (userId: string) => {
    console.log('fetchGoals llamado para usuario:', userId);
    set({ isLoading: true, error: null });
    
    try {
      // Obtener metas activas del usuario
      const goals = await GoalsService.getActiveGoals(userId);
      console.log('Metas obtenidas de Supabase:', goals);
      
      // Convertir al formato del store
      const localGoals = goals.map(convertDBGoalToLocal);
      
      set({ 
        goals: localGoals, 
        isLoading: false,
        error: null 
      });
      
      console.log('Store actualizado con metas:', localGoals.length);
    } catch (error: any) {
      console.error('Error cargando metas:', error);
      set({ 
        isLoading: false, 
        error: error.message || 'Error al cargar las metas' 
      });
    }
  },
  
  setGoals: (goals) => {
    console.log('setGoals llamado con:', goals.length, 'metas');
    set({ goals });
  },
  
  addGoal: (goalData) => {
    console.log('addGoal llamado (local):', goalData);
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
  
  setActiveGoal: (id) =>
    set({ activeGoalId: id }),
  
  addContribution: async (goalId, amount, source) => {
    console.log('addContribution llamado:', { goalId, amount, source });
    
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No hay usuario autenticado');
        return;
      }
      
      // Crear contribución en Supabase
      const contribution = await GoalsService.addContribution({
        user_id: user.id,
        goal_id: goalId,
        amount,
        source,
      });
      
      console.log('Contribución creada:', contribution);
      
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
      console.error('Error agregando contribución:', error);
      set({ error: 'Error al agregar contribución' });
    }
  },
  
  fetchContributions: async (goalId: string) => {
    try {
      const contributions = await GoalsService.getGoalContributions(goalId);
      
      const localContributions: Contribution[] = contributions.map(c => ({
        id: c.id,
        goalId: c.goal_id,
        amount: c.amount,
        source: c.source,
        createdAt: c.created_at,
      }));
      
      set((state) => ({
        contributions: [
          ...state.contributions.filter(c => c.goalId !== goalId),
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
    console.log('Limpiando store de metas');
    set({
      goals: [],
      contributions: [],
      activeGoalId: null,
      isLoading: false,
      error: null,
    });
  },
}));