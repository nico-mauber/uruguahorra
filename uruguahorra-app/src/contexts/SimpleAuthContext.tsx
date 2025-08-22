/**
 * Contexto de Autenticación Simplificado
 * 
 * Reemplaza el complejo AuthContext con una versión minimalista y funcional
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SimpleAuthService } from '@/services/simple-auth.service';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface SimpleAuthContextType {
  // Estado básico
  user: SupabaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Métodos simples
  signUp: (
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error('useSimpleAuth must be used within SimpleAuthProvider');
  }
  return context;
};

interface SimpleAuthProviderProps {
  children: React.ReactNode;
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Cargar usuario al iniciar
  useEffect(() => {
    loadUser();

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SimpleAuth] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        // NO llamamos loadUserProfile aquí para evitar duplicados
          // Se maneja en signIn/signUp donde tenemos más control
      } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Cargar usuario y perfil
  const loadUser = async () => {
    try {
      setIsLoading(true);
      
      const session = await SimpleAuthService.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('[SimpleAuth] Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar perfil del usuario
  const loadUserProfile = async (userId: string) => {
    // Evitar llamadas duplicadas
    if (loadingProfile) {
      console.log('[SimpleAuth] Ya se está cargando el perfil, omitiendo...');
      return;
    }

    try {
      setLoadingProfile(true);
      console.log('[SimpleAuth] Cargando perfil para usuario:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        console.log('[SimpleAuth] Perfil encontrado');
        setProfile(data);
      } else {
        console.log('[SimpleAuth] Perfil no encontrado, creándolo...');
        
        // Obtener datos del usuario autenticado
        const { data: authUser } = await supabase.auth.getUser();
        
        if (!authUser?.user) {
          console.error('[SimpleAuth] No se pudo obtener usuario autenticado');
          return;
        }
        
        // Crear perfil directamente
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: authUser.user.email || '',
            country: 'UY',
            currency: 'UYU',
            premium: false,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            last_activity_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('[SimpleAuth] Error creando perfil:', insertError);
          
          // Fallback: intentar con RPC
          const { data: rpcProfile } = await supabase
            .rpc('get_or_create_user_profile', {
              p_user_id: userId,
            });
          
          if (rpcProfile) {
            console.log('[SimpleAuth] Perfil creado con RPC');
            setProfile(rpcProfile);
          }
        } else if (newProfile) {
          console.log('[SimpleAuth] Perfil creado exitosamente');
          setProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('[SimpleAuth] Error loading profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Registrar usuario
  const signUp = async (
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const result = await SimpleAuthService.signUp(email, password, metadata);
      
      if (result.success && result.user) {
        setUser(result.user);
        
        if (result.profile) {
          setProfile(result.profile);
        } else {
          await loadUserProfile(result.user.id);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SimpleAuth] SignUp error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar sesión
  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const result = await SimpleAuthService.signIn(email, password);
      
      if (result.success && result.user) {
        setUser(result.user);
        
        if (result.profile) {
          setProfile(result.profile);
        } else {
          await loadUserProfile(result.user.id);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SimpleAuth] SignIn error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    try {
      await SimpleAuthService.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('[SimpleAuth] SignOut error:', error);
    }
  };

  // Actualizar perfil
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const value: SimpleAuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

// Hook de compatibilidad para migración gradual
export const useAuth = () => {
  const context = useSimpleAuth();
  
  // Adaptar a la interfaz anterior para compatibilidad
  // IMPORTANTE: Usar el ID del usuario autenticado, no del perfil
  return {
    user: context.profile && context.user ? {
      ...context.profile,
      id: context.user.id, // Usar SIEMPRE el ID del usuario autenticado de Supabase
      level: 1,
      totalXP: context.profile.total_xp || 0,
      streak: context.profile.current_streak || 0,
    } : null,
    supabaseUser: context.user,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    isPremium: context.profile?.premium || false,
    rateLimitError: null,
    login: context.signIn,
    signup: context.signUp,
    logout: context.signOut,
    updateUserXP: () => {},
    updateStreak: () => {},
    updateProfile: async () => {},
    clearRateLimitError: () => {},
    refreshUser: context.refreshProfile,
  };
};