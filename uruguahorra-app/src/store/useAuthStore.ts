import { create } from 'zustand';
import { AuthService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

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
  signup: (email: string, password: string, metadata?: { country?: string; currency?: string }) => Promise<void>;
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
    console.log('useAuthStore.login - Iniciando sesión');
    set({ isLoading: true });
    try {
      // 1. Autenticar con Supabase
      const { user: authUser, session } = await AuthService.signIn(email, password);
      
      if (!authUser) throw new Error('No se pudo autenticar');
      
      console.log('Usuario autenticado:', authUser.id);
      
      // 2. Obtener perfil del usuario
      let profile = await AuthService.getUserProfile(authUser.id);
      
      if (!profile) {
        console.log('Perfil no encontrado, creando uno nuevo...');
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
          console.error('Error creando perfil:', insertError);
          throw insertError;
        }
        
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
      set({
        user: {
          ...profile!,
          level,
          totalXP,
          streak: 0, // TODO: Calcular racha real
        },
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error en login:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  signup: async (email, password, metadata) => {
    console.log('useAuthStore.signup - Iniciando registro');
    set({ isLoading: true });
    try {
      // 1. Registrar con Supabase
      const { user: authUser } = await AuthService.signUp(email, password, metadata);
      
      if (!authUser) throw new Error('No se pudo crear la cuenta');
      
      console.log('Usuario registrado, obteniendo perfil...');
      
      // 2. Intentar obtener el perfil creado
      let profile = await AuthService.getUserProfile(authUser.id);
      
      // Si no existe perfil (no debería pasar con el código actualizado), usar valores por defecto
      if (!profile) {
        console.warn('Perfil no encontrado después del registro, usando valores por defecto');
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
      
      console.log('Perfil obtenido:', profile);
      
      // 3. Actualizar el store
      const userWithStats = {
        ...profile,
        id: authUser.id, // Asegurar que el ID esté presente
        level: 1,
        totalXP: 0,
        streak: 0,
      };
      
      console.log('Usuario configurado en store:', userWithStats);
      
      set({
        user: userWithStats,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium: false,
        isLoading: false,
      });
      
      console.log('Store actualizado exitosamente');
    } catch (error: any) {
      console.error('Error detallado en signup:', error);
      console.error('Mensaje:', error.message);
      console.error('Código:', error.code);
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await AuthService.signOut();
      set({
        user: null,
        supabaseUser: null,
        isAuthenticated: false,
        isPremium: false,
      });
    } catch (error) {
      console.error('Error en logout:', error);
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
      
      console.log('checkSession - Usuario autenticado configurado en store:', userWithStats);
      console.log('checkSession - ID del usuario:', userWithStats.id);
      console.log('checkSession - Email del usuario:', userWithStats.email);
      
      set({
        user: userWithStats,
        supabaseUser: authUser,
        isAuthenticated: true,
        isPremium,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error verificando sesión:', error);
      set({ isLoading: false });
    }
  },
  
  updateProfile: async (updates) => {
    const state = get();
    if (!state.user) throw new Error('No hay usuario autenticado');
    
    try {
      const updatedProfile = await AuthService.updateUserProfile(state.user.id, updates);
      
      set({
        user: {
          ...state.user,
          ...updatedProfile,
        },
      });
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  },
}));

// Configurar listener para cambios de autenticación
AuthService.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  
  if (event === 'SIGNED_IN' && session) {
    useAuthStore.getState().checkSession();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({
      user: null,
      supabaseUser: null,
      isAuthenticated: false,
      isPremium: false,
    });
  }
});