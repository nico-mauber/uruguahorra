import { create } from 'zustand';
import { SquadsService } from '@/services/squads.service';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

// Tipos de la BD
type DBSquad = Database['public']['Tables']['squads']['Row'];
type DBSquadMember = Database['public']['Tables']['squad_members']['Row'];

// Tipos de la store (formato local)
interface Squad {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  inviteCode: string;
  maxMembers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos calculados
  memberRole?: 'owner' | 'admin' | 'member';
  memberCount?: number;
  totalSquadSaved?: number; // Total ahorrado por el squad
  goalAmount?: number; // Meta de ahorro del squad
}

interface SquadMember {
  id: string;
  squadId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  totalSaved: number;
  monthlySaved: number;
  // Info del usuario
  user?: {
    id: string;
    email: string;
    country: string | null;
    premium: boolean;
  };
}

// Tipos para contribuciones de squad
interface SquadContribution {
  id: string;
  squadId: string;
  userId: string;
  amount: number;
  description?: string;
  source: string;
  createdAt: string;
}

interface SquadContributionInsert {
  squadId: string;
  userId: string;
  amount: number;
  description?: string;
  source?: string;
}

// Estado de la store
interface SquadsStore {
  // Estado de squads del usuario
  userSquads: Squad[];
  currentSquad: Squad | null;
  squadMembers: Record<string, SquadMember[] | undefined>; // squadId -> members

  // Estado de contribuciones
  squadContributions: Record<string, SquadContribution[] | undefined>; // squadId -> contributions

  // Estados de búsqueda
  searchResults: Squad[];

  // Estados de carga y error
  isLoading: boolean;
  isCreating: boolean;
  isJoining: boolean;
  isAddingContribution: boolean;
  error: string | null;
  lastFetchUserId: string | null;

  // ========== ACCIONES ==========

  // Gestión de squads del usuario
  fetchUserSquads: (userId: string, force?: boolean) => Promise<void>;
  createSquad: (squadData: {
    name: string;
    description?: string | null;
    ownerId: string;
    maxMembers?: number;
  }) => Promise<Squad | null>;

  // Unirse/salir de squads
  joinSquad: (userId: string, inviteCode: string) => Promise<boolean>;
  leaveSquad: (userId: string, squadId: string) => Promise<void>;

  // Gestión de squad actual
  setCurrentSquad: (squad: Squad | null) => void;
  fetchSquadMembers: (squadId: string, force?: boolean) => Promise<void>;
  updateSquadMemberStats: (userId: string, squadId: string) => Promise<void>;
  refreshAllSquadStats: (userId: string) => Promise<void>;

  // Gestión de contribuciones
  addSquadContribution: (
    contribution: SquadContributionInsert
  ) => Promise<SquadContribution | null>;
  fetchSquadContributions: (squadId: string, force?: boolean) => Promise<void>;
  getUserSquadContributions: (
    squadId: string,
    userId: string
  ) => Promise<SquadContribution[]>;

  // Configuración del squad
  updateSquadGoal: (
    squadId: string,
    goalAmount: number,
    userId: string
  ) => Promise<boolean>;

  // Búsqueda de squads
  searchSquads: (query: string, limit?: number) => Promise<void>;
  clearSearchResults: () => void;

  // Utilidades
  getUserSquadById: (squadId: string) => Squad | null;
  isUserInSquad: (squadId: string) => boolean;
  getUserRoleInSquad: (squadId: string) => 'owner' | 'admin' | 'member' | null;
  clearStore: () => void;
}

// ========== HELPERS ==========

const convertDBSquadToLocal = (
  dbSquad: DBSquad,
  memberRole?: string,
  memberCount?: number,
  totalSquadSaved?: number,
  goalAmount?: number
): Squad => ({
  id: dbSquad.id,
  name: dbSquad.name,
  description: dbSquad.description,
  ownerId: dbSquad.owner_id,
  inviteCode: dbSquad.invite_code,
  maxMembers: dbSquad.max_members,
  isActive: dbSquad.is_active,
  createdAt: dbSquad.created_at,
  updatedAt: dbSquad.updated_at,
  memberRole: memberRole as 'owner' | 'admin' | 'member' | undefined,
  memberCount,
  totalSquadSaved,
  goalAmount,
});

const convertDBSquadMemberToLocal = (
  dbMember: DBSquadMember & {
    user?: {
      id: string;
      email: string;
      country: string | null;
      premium: boolean;
    };
  }
): SquadMember => ({
  id: dbMember.id,
  squadId: dbMember.squad_id,
  userId: dbMember.user_id,
  role: dbMember.role,
  joinedAt: dbMember.joined_at,
  totalSaved: dbMember.total_saved,
  monthlySaved: dbMember.monthly_saved,
  user: dbMember.user,
});

// ========== STORE ==========

export const useSquadsStore = create<SquadsStore>((set, get) => ({
  // Estado inicial
  userSquads: [],
  currentSquad: null,
  squadMembers: {},
  squadContributions: {},
  searchResults: [],
  isLoading: false,
  isCreating: false,
  isJoining: false,
  isAddingContribution: false,
  error: null,
  lastFetchUserId: null,

  // ========== IMPLEMENTACIÓN DE ACCIONES ==========

  fetchUserSquads: async (userId: string, force: boolean = false) => {
    logger.debug(LogModule.CACHE, 'fetchUserSquads llamado', { userId, force });

    const currentState = get();

    // Prevenir llamadas duplicadas
    if (currentState.isLoading) {
      logger.warn(
        LogModule.CACHE,
        'Ya se están cargando squads, evitando duplicada'
      );
      return;
    }

    // Cache hit - usar datos existentes si no es forzado
    if (!force && currentState.lastFetchUserId === userId) {
      logger.info(LogModule.CACHE, 'Cache hit - Usando squads almacenados');
      return;
    }

    logger.loading(
      LogModule.STORE,
      'Cargando squads del usuario desde Supabase'
    );
    set({ isLoading: true, error: null });

    try {
      const squadsData = await SquadsService.getUserSquads(userId);

      const userSquads = squadsData.map((squadData) =>
        convertDBSquadToLocal(
          squadData,
          squadData.memberRole,
          squadData.memberCount,
          squadData.totalSquadSaved,
          squadData.goalAmount
        )
      );

      set({
        userSquads,
        lastFetchUserId: userId,
        error: null,
      });

      logger.success(
        LogModule.STORE,
        `${userSquads.length} squads cargados exitosamente`
      );
    } catch (error) {
      logger.error(LogModule.STORE, 'Error cargando squads del usuario', error);
      set({ error: 'Error cargando squads' });
    } finally {
      set({ isLoading: false });
    }
  },

  createSquad: async (squadData) => {
    logger.start(LogModule.STORE, 'Creando nuevo squad', {
      name: squadData.name,
    });
    set({ isCreating: true, error: null });

    try {
      const newSquad = await SquadsService.createSquad({
        name: squadData.name,
        description: squadData.description ?? null,
        owner_id: squadData.ownerId,
        max_members: squadData.maxMembers ?? 10,
      });

      const localSquad = convertDBSquadToLocal(newSquad, 'owner', 1);

      // Agregar a la lista local
      set((state) => ({
        userSquads: [...state.userSquads, localSquad],
      }));

      logger.success(LogModule.STORE, 'Squad creado exitosamente', {
        squadId: newSquad.id,
        inviteCode: newSquad.invite_code,
      });

      return localSquad;
    } catch (error) {
      logger.error(LogModule.STORE, 'Error creando squad', error);
      set({ error: 'Error creando squad' });
      return null;
    } finally {
      set({ isCreating: false });
    }
  },

  joinSquad: async (userId: string, inviteCode: string) => {
    logger.start(LogModule.STORE, 'Uniéndose a squad', { inviteCode });
    set({ isJoining: true, error: null });

    try {
      await SquadsService.joinSquad(userId, inviteCode);

      // Refrescar la lista de squads del usuario
      await get().fetchUserSquads(userId, true);

      logger.success(LogModule.STORE, 'Se unió al squad exitosamente');
      return true;
    } catch (error) {
      logger.error(LogModule.STORE, 'Error uniéndose a squad', error);
      set({ error: 'Error uniéndose a squad' });
      return false;
    } finally {
      set({ isJoining: false });
    }
  },

  leaveSquad: async (userId: string, squadId: string) => {
    logger.start(LogModule.STORE, 'Saliendo del squad', { squadId });
    set({ isLoading: true, error: null });

    try {
      await SquadsService.leaveSquad(userId, squadId);

      // Remover de la lista local
      set((state) => {
        const newSquadMembers = { ...state.squadMembers };
        delete newSquadMembers[squadId];

        return {
          userSquads: state.userSquads.filter((squad) => squad.id !== squadId),
          currentSquad:
            state.currentSquad?.id === squadId ? null : state.currentSquad,
          squadMembers: newSquadMembers,
        };
      });

      logger.success(LogModule.STORE, 'Salió del squad exitosamente');
    } catch (error) {
      logger.error(LogModule.STORE, 'Error saliendo del squad', error);
      set({ error: 'Error saliendo del squad' });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentSquad: (squad: Squad | null) => {
    set({ currentSquad: squad });
  },

  fetchSquadMembers: async (squadId: string, force: boolean = false) => {
    const currentState = get();

    // Cache hit - usar miembros existentes si no es forzado
    if (!force && currentState.squadMembers[squadId]) {
      logger.info(LogModule.CACHE, 'Cache hit - Usando miembros almacenados', {
        squadId,
      });
      return;
    }

    logger.loading(LogModule.STORE, 'Cargando miembros del squad', { squadId });
    set({ isLoading: true, error: null });

    try {
      const membersData = await SquadsService.getSquadMembers(squadId);

      const members = membersData.map((member) =>
        convertDBSquadMemberToLocal(
          member as DBSquadMember & {
            user?: {
              id: string;
              email: string;
              country: string | null;
              premium: boolean;
            };
          }
        )
      );

      set((state) => ({
        squadMembers: {
          ...state.squadMembers,
          [squadId]: members,
        },
        error: null,
      }));

      logger.success(LogModule.STORE, `${members.length} miembros cargados`);
    } catch (error) {
      logger.error(LogModule.STORE, 'Error cargando miembros del squad', error);
      set({ error: 'Error cargando miembros' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSquadMemberStats: async (userId: string, squadId: string) => {
    logger.debug(LogModule.STORE, 'Actualizando estadísticas de miembro', {
      userId,
      squadId,
    });

    try {
      await SquadsService.updateMemberSavings(userId, squadId);

      // Refrescar miembros del squad para obtener stats actualizadas
      await get().fetchSquadMembers(squadId, true);

      logger.success(LogModule.STORE, 'Estadísticas de miembro actualizadas');
    } catch (error) {
      logger.error(
        LogModule.STORE,
        'Error actualizando estadísticas de miembro',
        error
      );
    }
  },

  refreshAllSquadStats: async (userId: string) => {
    logger.start(
      LogModule.STORE,
      'Refrescando estadísticas de todos los squads',
      {
        userId,
        squadsCount: get().userSquads.length,
      }
    );

    try {
      const { userSquads } = get();

      if (userSquads.length === 0) {
        logger.debug(LogModule.STORE, 'No hay squads para actualizar');
        return;
      }

      // Actualizar estadísticas en paralelo
      const updatePromises = userSquads.map(async (squad) => {
        try {
          await SquadsService.updateMemberSavings(userId, squad.id);
          // Refrescar miembros del squad para obtener datos actualizados
          await get().fetchSquadMembers(squad.id, true);
        } catch (error) {
          logger.warn(LogModule.STORE, 'Error actualizando squad específico', {
            squadId: squad.id,
            squadName: squad.name,
            error,
          });
          // No lanzar error para que otros squads se puedan actualizar
        }
      });

      await Promise.all(updatePromises);

      logger.success(LogModule.STORE, 'Todas las estadísticas actualizadas', {
        squadsProcessed: userSquads.length,
      });
    } catch (error) {
      logger.error(
        LogModule.STORE,
        'Error refrescando estadísticas globales',
        error
      );
    }
  },

  searchSquads: async (query: string, limit: number = 20) => {
    logger.loading(LogModule.STORE, 'Buscando squads públicos', {
      query,
      limit,
    });
    set({ isLoading: true, error: null });

    try {
      const results = await SquadsService.searchSquads(query, limit);
      const searchResults = results.map((squad) =>
        convertDBSquadToLocal(squad)
      );

      set({ searchResults, error: null });
      logger.success(
        LogModule.STORE,
        `${searchResults.length} squads encontrados`
      );
    } catch (error) {
      logger.error(LogModule.STORE, 'Error buscando squads', error);
      set({ error: 'Error en búsqueda', searchResults: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [] });
  },

  // ========== UTILIDADES ==========

  getUserSquadById: (squadId: string) => {
    const state = get();
    return state.userSquads.find((squad) => squad.id === squadId) ?? null;
  },

  isUserInSquad: (squadId: string) => {
    const state = get();
    return state.userSquads.some((squad) => squad.id === squadId);
  },

  getUserRoleInSquad: (squadId: string) => {
    const state = get();
    const squad = state.userSquads.find((s) => s.id === squadId);
    return squad?.memberRole ?? null;
  },

  clearStore: () => {
    logger.info(LogModule.STORE, 'Limpiando store de squads completamente');
    set({
      userSquads: [],
      currentSquad: null,
      squadMembers: {},
      squadContributions: {},
      searchResults: [],
      isLoading: false,
      isCreating: false,
      isJoining: false,
      isAddingContribution: false,
      error: null,
      lastFetchUserId: null,
    });
  },

  // ========== MÉTODOS PARA CONTRIBUCIONES ==========

  addSquadContribution: async (
    contribution: SquadContributionInsert
  ): Promise<SquadContribution | null> => {
    try {
      set({ isAddingContribution: true, error: null });

      logger.start(LogModule.STORE, 'Agregando contribución al squad', {
        squadId: contribution.squadId,
        amount: contribution.amount,
      });

      // Convertir formato local a DB
      const dbContribution = {
        squad_id: contribution.squadId,
        user_id: contribution.userId,
        amount: contribution.amount,
        description: contribution.description,
        source: contribution.source,
      };

      const result = await SquadsService.addSquadContribution(dbContribution);

      // Convertir resultado a formato local
      const localContribution: SquadContribution = {
        id: result.id,
        squadId: result.squad_id,
        userId: result.user_id,
        amount: result.amount,
        description: result.description || undefined,
        source: result.source,
        createdAt: result.created_at,
      };

      // Actualizar contribuciones en cache
      const currentContributions =
        get().squadContributions[contribution.squadId] || [];
      set({
        squadContributions: {
          ...get().squadContributions,
          [contribution.squadId]: [localContribution, ...currentContributions],
        },
      });

      // Refrescar datos del squad (los totales se actualizan automáticamente via triggers)
      await get().fetchSquadMembers(contribution.squadId, true);

      // CRÍTICO: Refrescar la lista de squads del usuario para actualizar totalSquadSaved
      if (contribution.userId) {
        await get().fetchUserSquads(contribution.userId, true);
      }

      logger.success(LogModule.STORE, 'Contribución agregada exitosamente');
      return localContribution;
    } catch (error) {
      logger.error(
        LogModule.STORE,
        'Error agregando contribución al squad',
        error
      );
      set({ error: 'Error al agregar contribución' });
      return null;
    } finally {
      set({ isAddingContribution: false });
    }
  },

  fetchSquadContributions: async (
    squadId: string,
    force = false
  ): Promise<void> => {
    try {
      // Si ya tenemos contribuciones y no es forzado, no hacer nada
      const currentContributions = get().squadContributions[squadId];
      if (currentContributions && !force) return;

      set({ isLoading: true, error: null });

      logger.start(LogModule.STORE, 'Obteniendo contribuciones del squad', {
        squadId,
      });

      const contributions = await SquadsService.getSquadContributions(squadId);

      // Convertir a formato local
      const localContributions: SquadContribution[] = contributions.map(
        (c) => ({
          id: c.id,
          squadId: c.squad_id,
          userId: c.user_id,
          amount: c.amount,
          description: c.description || undefined,
          source: c.source,
          createdAt: c.created_at,
        })
      );

      set({
        squadContributions: {
          ...get().squadContributions,
          [squadId]: localContributions,
        },
      });

      logger.success(LogModule.STORE, 'Contribuciones obtenidas exitosamente', {
        count: localContributions.length,
      });
    } catch (error) {
      logger.error(
        LogModule.STORE,
        'Error obteniendo contribuciones del squad',
        error
      );
      set({ error: 'Error al cargar contribuciones' });
    } finally {
      set({ isLoading: false });
    }
  },

  getUserSquadContributions: async (
    squadId: string,
    userId: string
  ): Promise<SquadContribution[]> => {
    try {
      logger.start(
        LogModule.STORE,
        'Obteniendo contribuciones del usuario en el squad',
        {
          squadId,
          userId,
        }
      );

      const contributions = await SquadsService.getUserSquadContributions(
        squadId,
        userId
      );

      // Convertir a formato local
      const localContributions: SquadContribution[] = contributions.map(
        (c) => ({
          id: c.id,
          squadId: c.squad_id,
          userId: c.user_id,
          amount: c.amount,
          description: c.description || undefined,
          source: c.source,
          createdAt: c.created_at,
        })
      );

      logger.success(
        LogModule.STORE,
        'Contribuciones del usuario obtenidas exitosamente',
        {
          count: localContributions.length,
        }
      );

      return localContributions;
    } catch (error) {
      logger.error(
        LogModule.STORE,
        'Error obteniendo contribuciones del usuario',
        error
      );
      return [];
    }
  },

  // ========== CONFIGURACIÓN DEL SQUAD ==========

  updateSquadGoal: async (
    squadId: string,
    goalAmount: number,
    userId: string
  ): Promise<boolean> => {
    try {
      logger.start(LogModule.STORE, 'Actualizando meta del squad', {
        squadId,
        goalAmount,
      });

      await SquadsService.updateSquadGoal(squadId, goalAmount, userId);

      // Actualizar el squad en cache
      const currentSquads = get().userSquads;
      const updatedSquads = currentSquads.map((squad) =>
        squad.id === squadId ? { ...squad, goalAmount } : squad
      );
      set({ userSquads: updatedSquads });

      // Actualizar currentSquad si es el que se está editando
      const currentSquad = get().currentSquad;
      if (currentSquad?.id === squadId) {
        set({ currentSquad: { ...currentSquad, goalAmount } });
      }

      logger.success(
        LogModule.STORE,
        'Meta del squad actualizada exitosamente'
      );
      return true;
    } catch (error) {
      logger.error(LogModule.STORE, 'Error actualizando meta del squad', error);
      set({ error: 'Error actualizando la meta del pod' });
      return false;
    }
  },
}));
