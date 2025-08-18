import { create } from 'zustand';
import { AuthService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

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
}

// Función auxiliar para calcular nivel basado en XP
const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp) / 2) + 1;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  supabaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  isPremium: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  login: async (email, password) => {
    logger.start(LogModule.STORE, 'Iniciando proceso de login en store', {
      email,
    });
    set({ isLoading: true });
    try {
      // 1. Autenticar con Supabase
      const { user: authUser, session } = await AuthService.signIn(
        email,
        password
      );

      if (!authUser) throw new Error('No se pudo autenticar');

      logger.user(LogModule.STORE, 'Usuario autenticado en store', {
        userId: authUser.id,
      });

      // 2. Obtener perfil del usuario
      logger.loading(LogModule.STORE, 'Obteniendo perfil del usuario');
      let profile = await AuthService.getUserProfile(authUser.id);

      if (!profile) {
        logger.warn(LogModule.STORE, 'Perfil no encontrado, creando uno nuevo');
        // Si no existe perfil, crearlo
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email!,
            country: 'UY',
            currency: 'UYU',
          })
          .select()
          .single();

        if (insertError) {
          logger.error(
            LogModule.DB,
            'Error creando perfil en login',
            insertError
          );
          throw insertError;
        }
        logger.success(LogModule.DB, 'Perfil creado durante login');

        profile = newProfile;
      }

      // 3. Verificar estado premium
      const isPremium = await AuthService.checkPremiumStatus(authUser.id);

      // 4. Obtener estadísticas del usuario (XP, nivel, racha)
      // Por ahora usamos valores por defecto, pero se pueden obtener de user_challenges
      const { count: challengesCompleted } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('status', 'done');

      const totalXP = (challengesCompleted || 0) * 50; // 50 XP por desafío
      const level = calculateLevel(totalXP);

      // 5. Actualizar el store
      const finalUser = {
        ...profile!,
        level,
        totalXP,
        streak: 0, // TODO: Calcular racha real
      };

      set({
        user: finalUser,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium,
        isLoading: false,
      });

      logger.success(LogModule.STORE, 'Login completado, estado actualizado', {
        userId: finalUser.id,
        level: finalUser.level,
        isPremium,
      });
    } catch (error) {
      logger.error(LogModule.STORE, 'Error en login store', error);
      set({ isLoading: false });
      throw error;
    }
  },

  signup: async (email, password, metadata) => {
    logger.start(LogModule.STORE, 'Iniciando proceso de registro en store', {
      email,
      metadata,
    });
    set({ isLoading: true });
    try {
      // 1. Registrar con Supabase
      const { user: authUser } = await AuthService.signUp(
        email,
        password,
        metadata
      );

      if (!authUser) throw new Error('No se pudo crear la cuenta');

      logger.success(LogModule.STORE, 'Usuario registrado, obteniendo perfil');

      // 2. Intentar obtener el perfil creado
      logger.loading(LogModule.STORE, 'Buscando perfil del nuevo usuario');
      let profile = await AuthService.getUserProfile(authUser.id);

      // Si no existe perfil, usar valores por defecto
      if (!profile) {
        logger.warn(
          LogModule.STORE,
          'Perfil no encontrado, usando valores por defecto'
        );
        profile = {
          id: authUser.id,
          email: authUser.email!,
          country: metadata?.country || 'UY',
          currency: metadata?.currency || 'UYU',
          premium: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // 3. Actualizar el store
      const userWithStats = {
        ...profile,
        id: authUser.id,
        level: 1,
        totalXP: 0,
        streak: 0,
      };

      logger.success(LogModule.STORE, 'Usuario registrado exitosamente', {
        userId: userWithStats.id,
      });

      set({
        user: userWithStats,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium: false,
        isLoading: false,
      });
    } catch (error: any) {
      logger.error(LogModule.STORE, 'Error en signup store', error);
      set({ isLoading: false });
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
      });
      logger.success(LogModule.STORE, 'Sesión cerrada exitosamente');
    } catch (error) {
      logger.error(LogModule.STORE, 'Error en logout', error);
      throw error;
    }
  },

  updateUserXP: (xp) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            totalXP: state.user.totalXP + xp,
            level: calculateLevel(state.user.totalXP + xp),
          }
        : null,
    })),

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

      // 3. Obtener perfil
      const profile = await AuthService.getUserProfile(authUser.id);

      if (!profile) {
        set({ isLoading: false });
        return;
      }

      // 4. Verificar premium
      const isPremium = await AuthService.checkPremiumStatus(authUser.id);

      // 5. Calcular estadísticas
      const { count: challengesCompleted } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('status', 'done');

      const totalXP = (challengesCompleted || 0) * 50;
      const level = calculateLevel(totalXP);

      // 6. Actualizar store
      const userWithStats = {
        ...profile,
        id: authUser.id, // Asegurar que el ID esté presente
        level,
        totalXP,
        streak: 0,
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
        isPremium,
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
}));

// Configurar listener para cambios de autenticación
AuthService.onAuthStateChange((event, session) => {
  logger.debug(LogModule.AUTH, 'Auth state changed', {
    event,
    hasSession: !!session,
  });

  if (event === 'SIGNED_IN' && session) {
    logger.info(LogModule.AUTH, 'Usuario autenticado, verificando sesión');
    useAuthStore.getState().checkSession();
  } else if (event === 'SIGNED_OUT') {
    logger.info(LogModule.AUTH, 'Usuario salió, limpiando store');
    useAuthStore.setState({
      user: null,
      supabaseUser: null,
      isAuthenticated: false,
      isPremium: false,
    });
    logger.success(LogModule.AUTH, 'Store limpiado tras logout');
  }
});
