import { create } from 'zustand';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  createdAt: string;
  category: 'emergency' | 'travel' | 'debt' | 'purchase';
}

interface Contribution {
  id: string;
  goalId: string;
  amount: number;
  source: 'manual' | 'roundup';
  createdAt: string;
}

interface GoalsStore {
  goals: Goal[];
  contributions: Contribution[];
  activeGoalId: string | null;
  
  addGoal: (goal: Omit<Goal, 'id' | 'savedAmount' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string | null) => void;
  
  addContribution: (goalId: string, amount: number, source: 'manual' | 'roundup') => void;
  getTotalSaved: () => number;
  getGoalProgress: (goalId: string) => number;
}

export const useGoalsStore = create<GoalsStore>((set, get) => ({
  goals: [],
  contributions: [],
  activeGoalId: null,
  
  addGoal: (goalData) =>
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
    })),
  
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
  
  addContribution: (goalId, amount, source) =>
    set((state) => {
      const contribution: Contribution = {
        id: Date.now().toString(),
        goalId,
        amount,
        source,
        createdAt: new Date().toISOString(),
      };
      
      return {
        contributions: [...state.contributions, contribution],
        goals: state.goals.map((goal) =>
          goal.id === goalId
            ? { ...goal, savedAmount: goal.savedAmount + amount }
            : goal
        ),
      };
    }),
  
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
}));