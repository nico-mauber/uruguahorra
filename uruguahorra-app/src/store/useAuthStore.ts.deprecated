import { create } from 'zustand';
import { AuthService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { LevelsService } from '@/features/gamification';
import { RateLimitError } from '@/lib/auth-interceptor';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface User extends UserProfile {
  level: number;
  totalXP: number;
  streak: number;
}

interface AuthStore {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPremium: boolean;
  rateLimitError: string | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserXP: (xp: number) => void;
  updateStreak: (streak: number) => void;
  checkSession: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearRateLimitError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  supabaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  isPremium: false,
  rateLimitError: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      rateLimitError: null, // Limpiar errores de rate limit al establecer usuario
    }),

  login: async (email, password) => {
    logger.start(LogModule.STORE, 'Iniciando proceso de login en store', {
      email,
    });
    set({ isLoading: true, rateLimitError: null });
    try {
      // 1. Autenticar con Supabase (ahora incluye rate limiting)
      const { user: authUser } = await AuthService.signIn(email, password);

      if (!authUser) throw new Error('No se pudo autenticar');

      logger.user(LogModule.STORE, 'Usuario autenticado en store', {
        userId: authUser.id,
      });

      // 2. OPTIMIZACIÓN: Obtener todos los datos en una sola llamada
      const userData = await AuthService.getUserCompleteData(authUser.id);

      if (!userData.profile) {
        // Para usuarios existentes haciendo login, el perfil debe existir
        logger.error(
          LogModule.STORE,
          'Perfil no encontrado para usuario existente',
          { userId: authUser.id, email: authUser.email }
        );
        throw new Error(
          'No se pudo encontrar el perfil del usuario. Por favor, contacte soporte.'
        );
      }

      // 3. Actualizar el store con todos los datos obtenidos
      const finalUser = {
        ...userData.profile,
        level: userData.level,
        totalXP: userData.totalXP,
        streak: userData.streak,
      };

      set({
        user: finalUser,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium: userData.isPremium,
        isLoading: false,
        rateLimitError: null,
      });

      logger.success(LogModule.STORE, 'Login completado, estado actualizado', {
        userId: finalUser.id,
        level: finalUser.level,
        isPremium: userData.isPremium,
      });
    } catch (error) {
      logger.error(LogModule.STORE, 'Error en login store', error);

      // Manejar errores de rate limiting específicamente
      const rateLimitError =
        error instanceof RateLimitError ? error.message : null;

      set({
        isLoading: false,
        rateLimitError,
      });

      throw error;
    }
  },

  signup: async (email, password, metadata) => {
    logger.start(LogModule.STORE, 'Iniciando proceso de registro en store', {
      email,
      metadata,
    });
    set({ isLoading: true, rateLimitError: null });
    try {
      // 1. Registrar con Supabase (ahora maneja la creación del perfil internamente y rate limiting)
      const { user: authUser, session } = await AuthService.signUp(
        email,
        password,
        metadata
      );

      if (!authUser) throw new Error('No se pudo crear la cuenta');

      logger.success(LogModule.STORE, 'Usuario registrado, obteniendo perfil');

      // 2. Obtener el perfil creado (debería existir ahora)
      logger.loading(LogModule.STORE, 'Buscando perfil del nuevo usuario');
      let profile = await AuthService.getUserProfile(authUser.id);

      // Si por alguna razón aún no existe, crear valores por defecto
      if (!profile) {
        logger.warn(
          LogModule.STORE,
          'Perfil aún no encontrado, creando valores por defecto'
        );

        // Intentar crear el perfil una vez más
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email!,
            country: metadata?.country || 'UY',
            currency: metadata?.currency || 'UYU',
            premium: false,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (!createError && newProfile) {
          profile = newProfile;
        } else {
          // Usar valores por defecto en memoria
          profile = {
            id: authUser.id,
            email: authUser.email!,
            country: metadata?.country || 'UY',
            currency: metadata?.currency || 'UYU',
            premium: false,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      // 3. Actualizar el store con el ID correcto del usuario autenticado
      const userWithStats = {
        ...profile,
        id: authUser.id, // SIEMPRE usar el ID del auth user
        level: profile.current_level || 1,
        totalXP: profile.total_xp || 0,
        streak: profile.current_streak || 0,
      };

      logger.success(LogModule.STORE, 'Usuario registrado exitosamente', {
        userId: userWithStats.id,
        hasSession: !!session,
      });

      set({
        user: userWithStats,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium: false,
        isLoading: false,
        rateLimitError: null,
      });
    } catch (error: unknown) {
      logger.error(LogModule.STORE, 'Error en signup store', error);

      // Manejar errores de rate limiting específicamente
      const rateLimitError =
        error instanceof RateLimitError ? error.message : null;

      set({
        isLoading: false,
        rateLimitError,
      });

      throw error;
    }
  },

  logout: async () => {
    try {
      logger.info(LogModule.STORE, 'Cerrando sesión de usuario');
      await AuthService.signOut();
      set({
        user: null,
        supabaseUser: null,
        isAuthenticated: false,
        isPremium: false,
        rateLimitError: null, // Limpiar errores de rate limit al cerrar sesión
      });
      logger.success(LogModule.STORE, 'Sesión cerrada exitosamente');
    } catch (error) {
      logger.error(LogModule.STORE, 'Error en logout', error);
      throw error;
    }
  },

  updateUserXP: (xp) =>
    set((state) => {
      if (!state.user) return state;

      const newTotalXP = state.user.totalXP + xp;
      const newLevel = LevelsService.getLevel(newTotalXP);

      return {
        user: {
          ...state.user,
          totalXP: newTotalXP,
          level: newLevel,
        },
      };
    }),

  updateStreak: (streak) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            streak,
          }
        : null,
    })),

  checkSession: async () => {
    set({ isLoading: true });
    try {
      // 1. Obtener sesión actual
      const session = await AuthService.getSession();

      if (!session) {
        set({ isLoading: false });
        return;
      }

      // 2. Obtener usuario actual
      const authUser = await AuthService.getCurrentUser();

      if (!authUser) {
        set({ isLoading: false });
        return;
      }

      // 3. OPTIMIZACIÓN: Obtener todos los datos en una sola llamada
      const userData = await AuthService.getUserCompleteData(authUser.id);

      if (!userData.profile) {
        logger.error(
          LogModule.STORE,
          'Perfil no encontrado para usuario con sesión activa',
          { userId: authUser.id, email: authUser.email }
        );
        set({ isLoading: false });
        return;
      }

      // 4. Actualizar store
      const userWithStats = {
        ...userData.profile,
        id: authUser.id, // Asegurar que el ID esté presente
        level: userData.level,
        totalXP: userData.totalXP,
        streak: userData.streak,
      };

      logger.success(LogModule.STORE, 'Sesión verificada exitosamente', {
        userId: userWithStats.id,
        email: userWithStats.email,
        level: userWithStats.level,
      });

      set({
        user: userWithStats,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium: userData.isPremium,
        isLoading: false,
      });
    } catch (error) {
      logger.error(LogModule.STORE, 'Error verificando sesión', error);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const state = get();
    if (!state.user) throw new Error('No hay usuario autenticado');

    try {
      const updatedProfile = await AuthService.updateUserProfile(
        state.user.id,
        updates
      );

      set({
        user: {
          ...state.user,
          ...updatedProfile,
        },
      });
    } catch (error) {
      logger.error(LogModule.STORE, 'Error actualizando perfil', error);
      throw error;
    }
  },

  clearRateLimitError: () => set({ rateLimitError: null }),
}));

// Configurar listener para cambios de autenticación
AuthService.onAuthStateChange((event, session) => {
  logger.debug(LogModule.AUTH, 'Auth state changed', {
    event,
    hasSession: !!session,
    userId: (session as any)?.user?.id || 'none',
  });

  const currentState = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session) {
    logger.info(LogModule.AUTH, 'Usuario autenticado, verificando sesión');

    // Verificar si es un usuario diferente al actual
    if (currentState.user && currentState.user.id !== (session as any).user.id) {
      logger.warn(
        LogModule.AUTH,
        'Cambio de usuario detectado, limpiando store primero',
        {
          previousUserId: currentState.user.id,
          newUserId: (session as any).user.id,
        }
      );

      // Limpiar store primero
      useAuthStore.setState({
        user: null,
        supabaseUser: null,
        isAuthenticated: false,
        isPremium: false,
        rateLimitError: null,
        isLoading: false,
      });
    }

    // Verificar sesión con el nuevo usuario
    setTimeout(() => {
      useAuthStore.getState().checkSession();
    }, 100);
  } else if (event === 'SIGNED_OUT') {
    logger.info(LogModule.AUTH, 'Usuario salió, limpiando store');
    useAuthStore.setState({
      user: null,
      supabaseUser: null,
      isAuthenticated: false,
      isPremium: false,
      rateLimitError: null,
      isLoading: false,
    });
    logger.success(LogModule.AUTH, 'Store limpiado tras logout');
  } else if (event === 'TOKEN_REFRESHED' && session) {
    logger.info(
      LogModule.AUTH,
      'Token refrescado, actualizando store si es necesario'
    );

    if (currentState.user && currentState.user.id !== (session as any).user.id) {
      logger.warn(
        LogModule.AUTH,
        'Usuario cambió durante refresh, re-verificando sesión'
      );
      useAuthStore.getState().checkSession();
    }
  }
});
