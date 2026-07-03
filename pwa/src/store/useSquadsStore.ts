import { create } from 'zustand';
import {
  SquadsService,
  type AddSquadContributionInput,
  type CreateSquadInput,
  type UserSquad,
} from '@/services/SquadsService';
import { logger, LogModule } from '@/lib/logger';
import type { SquadMemberRow, SquadRow } from '@/types/database';

/**
 * Store de pods (squads). Fuente: docs/architecture/state-management §2.4,
 * docs/features/pods/pods-functional-specs.md (CU-1..CU-4).
 * Las filas de BD se conservan en snake_case (rows); la vista de lista usa
 * `UserSquad` (camelCase). Los miembros se cachean por squad id.
 */
interface SquadsState {
  userSquads: UserSquad[];
  squadMembers: Record<string, SquadMemberRow[]>;
  isLoading: boolean;
  isAddingContribution: boolean;
  isUpdatingGoal: boolean;
  error: string | null;
  lastFetchUserId: string | null;

  fetchUserSquads: (userId: string, force?: boolean) => Promise<void>;
  fetchSquadMembers: (squadId: string, force?: boolean) => Promise<void>;
  createSquad: (userId: string, input: CreateSquadInput) => Promise<SquadRow>;
  joinSquad: (userId: string, code: string) => Promise<SquadRow>;
  addSquadContribution: (input: AddSquadContributionInput) => Promise<void>;
  updateSquadGoal: (
    squadId: string,
    amount: number,
    userId: string
  ) => Promise<void>;
  leaveSquad: (squadId: string, userId: string) => Promise<void>;
  getSquadById: (id: string) => UserSquad | undefined;
  getUserRoleInSquad: (squadId: string) => string | undefined;
  clearStore: () => void;
}

export const useSquadsStore = create<SquadsState>((set, get) => ({
  userSquads: [],
  squadMembers: {},
  isLoading: false,
  isAddingContribution: false,
  isUpdatingGoal: false,
  error: null,
  lastFetchUserId: null,

  fetchUserSquads: async (userId, force) => {
    // Dedup: no recargar si ya se cargó para este usuario y no se fuerza.
    if (
      !force &&
      (get().isLoading || get().lastFetchUserId === userId)
    ) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const userSquads = await SquadsService.fetchUserSquads(userId);
      set({ userSquads, isLoading: false, lastFetchUserId: userId });
    } catch (error) {
      logger.error(LogModule.DB, 'Error cargando pods del usuario', error);
      set({ isLoading: false, error: 'No se pudieron cargar los pods' });
    }
  },

  fetchSquadMembers: async (squadId, force) => {
    // Dedup: usar caché salvo que se fuerce.
    if (!force && get().squadMembers[squadId]) return;
    try {
      const members = await SquadsService.fetchSquadMembers(squadId);
      set((state) => ({
        squadMembers: { ...state.squadMembers, [squadId]: members },
      }));
    } catch (error) {
      logger.error(LogModule.DB, 'Error cargando miembros del pod', error);
      set({ error: 'No se pudieron cargar los miembros del pod' });
    }
  },

  createSquad: async (userId, input) => {
    let squad: SquadRow;
    try {
      squad = await SquadsService.createSquad(userId, input);
    } catch (error) {
      logger.error(LogModule.DB, 'Error creando pod', error);
      throw error;
    }
    // Refetch de la lista para reflejar el nuevo pod.
    await get().fetchUserSquads(userId, true);
    return squad;
  },

  joinSquad: async (userId, code) => {
    let squad: SquadRow;
    try {
      squad = await SquadsService.joinSquad(userId, code);
    } catch (error) {
      logger.error(LogModule.DB, 'Error uniéndose al pod', error);
      // Relanzar: la UI muestra `error.message` (validaciones en español).
      throw error;
    }
    await get().fetchUserSquads(userId, true);
    return squad;
  },

  addSquadContribution: async (input) => {
    set({ isAddingContribution: true, error: null });
    try {
      await SquadsService.addSquadContribution(input);
    } catch (error) {
      logger.error(LogModule.DB, 'Error registrando contribución al pod', error);
      set({ isAddingContribution: false });
      throw error;
    }
    // Refetch lista + miembros para reflejar los totales recalculados.
    await get().fetchUserSquads(input.userId, true);
    await get().fetchSquadMembers(input.squadId, true);
    set({ isAddingContribution: false });
  },

  updateSquadGoal: async (squadId, amount, userId) => {
    set({ isUpdatingGoal: true, error: null });
    try {
      await SquadsService.updateSquadGoal(squadId, amount, userId);
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando la meta del pod', error);
      set({ isUpdatingGoal: false });
      throw error;
    }
    await get().fetchUserSquads(userId, true);
    set({ isUpdatingGoal: false });
  },

  leaveSquad: async (squadId, userId) => {
    try {
      await SquadsService.leaveSquad(squadId, userId);
    } catch (error) {
      logger.error(LogModule.DB, 'Error saliendo del pod', error);
      throw error;
    }
    await get().fetchUserSquads(userId, true);
  },

  getSquadById: (id) => get().userSquads.find((s) => s.id === id),

  getUserRoleInSquad: (squadId) =>
    get().userSquads.find((s) => s.id === squadId)?.memberRole,

  clearStore: () =>
    set({
      userSquads: [],
      squadMembers: {},
      isLoading: false,
      isAddingContribution: false,
      isUpdatingGoal: false,
      error: null,
      lastFetchUserId: null,
    }),
}));
