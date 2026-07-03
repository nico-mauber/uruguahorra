import { create } from 'zustand';
import {
  ChallengesService,
  type ChallengeDurationType,
} from '@/services/ChallengesService';
import { logger, LogModule } from '@/lib/logger';
import type {
  ChallengeCategoryRow,
  ChallengeRow,
  UserChallengeSessionRow,
} from '@/types/database';
import type { SessionProgress } from '@/types/gamification';

/**
 * Store de retos. Fuente: docs/architecture/state-management §2.5,
 * docs/features/challenges/challenges-functional-specs.md (CU-1..CU-3).
 * Las filas de BD se conservan en snake_case (rows); el progreso normalizado
 * vive en `progressBySession` (camelCase, indexado por session id).
 */
interface ChallengesState {
  categories: ChallengeCategoryRow[];
  challengesByCategory: Record<string, ChallengeRow[]>;
  activeSessions: UserChallengeSessionRow[];
  progressBySession: Record<string, SessionProgress>;
  selectedCategoryId: string | null;
  isLoading: boolean;
  error: string | null;

  loadInitial: (userId: string) => Promise<void>;
  selectCategory: (categoryId: string) => Promise<void>;
  startSession: (
    userId: string,
    challengeId: string,
    durationType: ChallengeDurationType
  ) => Promise<void>;
  performCheckin: (
    userId: string,
    sessionId: string,
    completed: boolean,
    note?: string
  ) => Promise<{ progress: SessionProgress; wasCompleted: boolean }>;
  refreshSessions: (userId: string) => Promise<void>;
  clearStore: () => void;
}

/** Calcula el progreso de cada sesión activa en paralelo (CU-1). */
async function computeProgress(
  sessions: UserChallengeSessionRow[]
): Promise<Record<string, SessionProgress>> {
  const entries = await Promise.all(
    sessions.map(
      async (s) =>
        [s.id, await ChallengesService.calculateProgress(s.id)] as const
    )
  );
  return Object.fromEntries(entries);
}

export const useChallengesStore = create<ChallengesState>((set, get) => ({
  categories: [],
  challengesByCategory: {},
  activeSessions: [],
  progressBySession: {},
  selectedCategoryId: null,
  isLoading: false,
  error: null,

  loadInitial: async (userId) => {
    set({ isLoading: true, error: null });
    // Expirar sesiones vencidas (best-effort, no bloquea la carga).
    await ChallengesService.expireSessions();
    try {
      const [categories, activeSessions] = await Promise.all([
        ChallengesService.getActiveCategories(),
        ChallengesService.getUserActiveSessions(userId),
      ]);

      // Seleccionar la primera categoría y cargar sus retos.
      const firstCategory = categories[0] ?? null;
      const challengesByCategory: Record<string, ChallengeRow[]> = {};
      if (firstCategory) {
        challengesByCategory[firstCategory.id] =
          await ChallengesService.getChallengesByCategory(firstCategory.id);
      }

      const progressBySession = await computeProgress(activeSessions);

      set({
        categories,
        activeSessions,
        challengesByCategory,
        progressBySession,
        selectedCategoryId: firstCategory?.id ?? null,
        isLoading: false,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error cargando retos (carga inicial)', error);
      set({ isLoading: false, error: 'No se pudieron cargar los retos' });
    }
  },

  selectCategory: async (categoryId) => {
    set({ selectedCategoryId: categoryId });
    // Dedup: no recargar si ya está cacheada.
    if (get().challengesByCategory[categoryId]) return;
    try {
      const challenges =
        await ChallengesService.getChallengesByCategory(categoryId);
      set((state) => ({
        challengesByCategory: {
          ...state.challengesByCategory,
          [categoryId]: challenges,
        },
      }));
    } catch (error) {
      logger.error(LogModule.DB, 'Error cargando retos de la categoría', error);
      set({ error: 'No se pudieron cargar los retos de esta categoría' });
    }
  },

  startSession: async (userId, challengeId, durationType) => {
    try {
      await ChallengesService.startSession(userId, challengeId, durationType);
    } catch (error) {
      logger.error(LogModule.DB, 'Error iniciando reto', error);
      // Relanzar: la UI muestra `error.message` (español desde la BD).
      throw error;
    }
    // Recargar sesiones activas + progreso.
    await get().refreshSessions(userId);
  },

  performCheckin: async (userId, sessionId, completed, note) => {
    let result: { progress: SessionProgress; wasCompleted: boolean };
    try {
      result = await ChallengesService.performDailyCheckin(
        userId,
        sessionId,
        completed,
        note
      );
    } catch (error) {
      logger.error(LogModule.DB, 'Error registrando check-in', error);
      set({ error: 'No se pudo registrar el check-in' });
      throw error;
    }
    // Recargar sesiones activas + recomputar progreso.
    await get().refreshSessions(userId);
    return result;
  },

  refreshSessions: async (userId) => {
    try {
      const activeSessions =
        await ChallengesService.getUserActiveSessions(userId);
      const progressBySession = await computeProgress(activeSessions);
      set({ activeSessions, progressBySession });
    } catch (error) {
      logger.error(LogModule.DB, 'Error refrescando sesiones de retos', error);
      set({ error: 'No se pudieron actualizar los retos' });
    }
  },

  clearStore: () =>
    set({
      categories: [],
      challengesByCategory: {},
      activeSessions: [],
      progressBySession: {},
      selectedCategoryId: null,
      isLoading: false,
      error: null,
    }),
}));
