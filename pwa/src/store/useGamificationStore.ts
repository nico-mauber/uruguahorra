import { create } from 'zustand';
import { GamificationService } from '@/services/GamificationService';
import { LevelsService } from '@/services/LevelsService';
import { logger, LogModule } from '@/lib/logger';
import type { UserBasicStats, StreakData, ContributionResult } from '@/types/gamification';

/**
 * Store de gamificación. Fuente: docs/architecture/state-management §2.7.
 * `applyContributionResult` actualiza el estado local sin refetch (patrón del dashboard).
 */
interface GamificationState {
  stats: UserBasicStats | null;
  isLoading: boolean;
  error: string | null;

  loadStats: (userId: string) => Promise<void>;
  applyContributionResult: (
    result: ContributionResult,
    updatedStreak?: StreakData
  ) => void;
  clearStore: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,

  loadStats: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await GamificationService.getUserBasicStats(userId);
      set({ stats, isLoading: false });
    } catch (error) {
      // §Robustez: propagar (la sección se oculta), no enmascarar con defaults.
      logger.error(LogModule.DB, 'Error cargando stats de gamificación', error);
      set({ isLoading: false, error: 'stats_unavailable', stats: null });
    }
  },

  applyContributionResult: (result, updatedStreak) => {
    const current = get().stats;
    if (!current) return;

    const totalXP = current.totalXP + (result.xpEarned || 0);
    const levelInfo = LevelsService.getLevelProgress(totalXP);

    set({
      stats: {
        ...current,
        totalXP,
        level: levelInfo.level,
        levelInfo,
        streak: updatedStreak ?? current.streak,
      },
    });
  },

  clearStore: () => set({ stats: null, isLoading: false, error: null }),
}));
