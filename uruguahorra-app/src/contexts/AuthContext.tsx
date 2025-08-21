import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { AuthService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { LevelsService } from '@/features/gamification';
import { RateLimitError } from '@/lib/auth-interceptor';
import { useAnalytics, AnalyticsEvents } from '@/hooks/useAnalytics';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface User extends UserProfile {
  level: number;
  totalXP: number;
  streak: number;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPremium: boolean;
  rateLimitError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserXP: (xp: number) => void;
  updateStreak: (streak: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearRateLimitError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Analytics hook
  const analytics = useAnalytics();

  // Función para cargar datos completos del usuario
  const loadUserData = useCallback(async (authUser: SupabaseUser) => {
    try {
      logger.start(LogModule.AUTH, 'Cargando datos completos del usuario', {
        userId: authUser.id,
      });

      const userData = await AuthService.getUserCompleteData(authUser.id);

      if (!userData.profile) {
        logger.error(
          LogModule.AUTH,
          'Perfil no encontrado para usuario con sesión activa',
          { userId: authUser.id, email: authUser.email }
        );
        return null;
      }

      const userWithStats = {
        ...userData.profile,
        id: authUser.id,
        level: userData.level,
        totalXP: userData.totalXP,
        streak: userData.streak,
      };

      logger.success(
        LogModule.AUTH,
        'Datos del usuario cargados exitosamente',
        {
          userId: userWithStats.id,
          level: userWithStats.level,
        }
      );

      return {
        user: userWithStats,
        isPremium: userData.isPremium,
      };
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error cargando datos del usuario', error);
      return null;
    }
  }, []);

  // Función para actualizar el estado de autenticación
  const updateAuthState = useCallback(
    async (session: Session | null) => {
      if (!session) {
        logger.info(LogModule.AUTH, 'No hay sesión activa, limpiando estado');
        setUser(null);
        setSupabaseUser(null);
        setIsAuthenticated(false);
        setIsPremium(false);
        setIsLoading(false);
        return;
      }

      const authUser = session.user;

      // Si ya tenemos el mismo usuario, no recargar datos
      if (user && user.id === authUser.id) {
        logger.debug(
          LogModule.AUTH,
          'Usuario ya cargado, actualizando solo session'
        );
        setSupabaseUser(authUser);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Cargar datos del nuevo usuario
      const userData = await loadUserData(authUser);

      if (userData) {
        setUser(userData.user);
        setSupabaseUser(authUser);
        setIsAuthenticated(true);
        setIsPremium(userData.isPremium);
      } else {
        setUser(null);
        setSupabaseUser(null);
        setIsAuthenticated(false);
        setIsPremium(false);
      }

      setIsLoading(false);
    },
    [user, loadUserData]
  );

  // Inicialización del AuthProvider
  useEffect(() => {
    if (isInitialized) return;

    const initializeAuth = async () => {
      try {
        logger.start(LogModule.AUTH, 'Inicializando AuthProvider');
        setIsLoading(true);

        // Obtener sesión actual
        const session = await AuthService.getSession();
        await updateAuthState(session);

        logger.success(
          LogModule.AUTH,
          'AuthProvider inicializado exitosamente'
        );
      } catch (error) {
        logger.error(LogModule.AUTH, 'Error inicializando AuthProvider', error);
        setIsLoading(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [isInitialized, updateAuthState]);

  // Listener para cambios de estado de autenticación
  useEffect(() => {
    if (!isInitialized) return;

    logger.info(LogModule.AUTH, 'Configurando listener de auth state changes');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug(LogModule.AUTH, 'Auth state changed', {
        event,
        hasSession: !!session,
        userId: session?.user?.id || 'none',
      });

      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            logger.info(LogModule.AUTH, 'Usuario autenticado');
            await updateAuthState(session);
          }
          break;

        case 'SIGNED_OUT':
          logger.info(LogModule.AUTH, 'Usuario desautenticado');
          await updateAuthState(null);
          break;

        case 'TOKEN_REFRESHED':
          if (session) {
            logger.debug(LogModule.AUTH, 'Token refrescado');
            // Solo actualizar si cambió el usuario
            if (!user || user.id !== session.user.id) {
              await updateAuthState(session);
            } else {
              setSupabaseUser(session.user);
            }
          }
          break;

        default:
          break;
      }
    });

    return () => {
      logger.info(LogModule.AUTH, 'Limpiando listener de auth state changes');
      subscription.unsubscribe();
    };
  }, [isInitialized, updateAuthState, user]);

  // Métodos de autenticación
  const login = useCallback(
    async (email: string, password: string) => {
      logger.start(LogModule.AUTH, 'Iniciando proceso de login', { email });
      setIsLoading(true);
      setRateLimitError(null);

      try {
        const { user: authUser } = await AuthService.signIn(email, password);

        if (!authUser) throw new Error('No se pudo autenticar');

        const userData = await loadUserData(authUser);

        if (!userData) {
          throw new Error('No se pudo cargar los datos del usuario');
        }

        setUser(userData.user);
        setSupabaseUser(authUser);
        setIsAuthenticated(true);
        setIsPremium(userData.isPremium);
        setRateLimitError(null);

        // Analytics: Track user sign in
        analytics.identify(userData.user.id, {
          email: authUser.email,
          country: userData.user.country,
          currency: userData.user.currency,
          is_premium: userData.isPremium,
          level: userData.user.level,
          total_xp: userData.user.totalXP,
          streak: userData.user.streak,
        });

        analytics.setContext({
          country: userData.user.country || 'UY',
          currency: userData.user.currency || 'UYU',
          plan: userData.isPremium ? 'premium' : 'free',
        });

        analytics.track(AnalyticsEvents.USER_SIGNED_IN, {
          method: 'email',
          user_id: userData.user.id,
        });

        logger.success(LogModule.AUTH, 'Login completado exitosamente', {
          userId: userData.user.id,
        });
      } catch (error) {
        logger.error(LogModule.AUTH, 'Error en login', error);

        const rateLimitError =
          error instanceof RateLimitError ? error.message : null;
        setRateLimitError(rateLimitError);

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserData]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { country?: string; currency?: string }
    ) => {
      logger.start(LogModule.AUTH, 'Iniciando proceso de registro', {
        email,
        metadata,
      });
      setIsLoading(true);
      setRateLimitError(null);

      try {
        const { user: authUser } = await AuthService.signUp(
          email,
          password,
          metadata
        );

        if (!authUser) throw new Error('No se pudo crear la cuenta');

        // Para signup, el usuario se creará automáticamente por el trigger de la DB
        // Esperamos un poco y luego cargamos los datos
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const userData = await loadUserData(authUser);

        if (userData) {
          setUser(userData.user);
          setSupabaseUser(authUser);
          setIsAuthenticated(true);
          setIsPremium(userData.isPremium);

          // Analytics: Track user sign up
          analytics.identify(userData.user.id, {
            email: authUser.email,
            country: userData.user.country || metadata?.country,
            currency: userData.user.currency || metadata?.currency,
            is_premium: userData.isPremium,
            level: userData.user.level,
            total_xp: userData.user.totalXP,
            streak: userData.user.streak,
          });

          analytics.setContext({
            country: userData.user.country || metadata?.country || 'UY',
            currency: userData.user.currency || metadata?.currency || 'UYU',
            plan: userData.isPremium ? 'premium' : 'free',
          });

          analytics.track(AnalyticsEvents.USER_SIGNED_UP, {
            method: 'email',
            user_id: userData.user.id,
            country: metadata?.country,
            currency: metadata?.currency,
          });
        }

        logger.success(LogModule.AUTH, 'Registro completado exitosamente', {
          userId: authUser.id,
        });
      } catch (error) {
        logger.error(LogModule.AUTH, 'Error en registro', error);

        const rateLimitError =
          error instanceof RateLimitError ? error.message : null;
        setRateLimitError(rateLimitError);

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserData]
  );

  const logout = useCallback(async () => {
    try {
      logger.info(LogModule.AUTH, 'Cerrando sesión');

      // Analytics: Track user sign out
      if (user) {
        analytics.track(AnalyticsEvents.USER_SIGNED_OUT, {
          user_id: user.id,
        });
      }

      await AuthService.signOut();

      setUser(null);
      setSupabaseUser(null);
      setIsAuthenticated(false);
      setIsPremium(false);
      setRateLimitError(null);

      // Reset analytics
      analytics.reset();

      logger.success(LogModule.AUTH, 'Sesión cerrada exitosamente');
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error en logout', error);
      throw error;
    }
  }, [user]);

  const updateUserXP = useCallback(
    (xp: number) => {
      if (!user) return;

      const oldLevel = user.level;
      const newTotalXP = user.totalXP + xp;
      const newLevel = LevelsService.getLevel(newTotalXP);

      setUser({
        ...user,
        totalXP: newTotalXP,
        level: newLevel,
      });

      // Analytics: Track XP earned
      analytics.track(AnalyticsEvents.XP_EARNED, {
        user_id: user.id,
        xp_earned: xp,
        total_xp: newTotalXP,
        old_level: oldLevel,
        new_level: newLevel,
      });

      // Analytics: Track level up if applicable
      if (newLevel > oldLevel) {
        analytics.track(AnalyticsEvents.LEVEL_UP, {
          user_id: user.id,
          old_level: oldLevel,
          new_level: newLevel,
          total_xp: newTotalXP,
        });
      }
    },
    [user]
  );

  const updateStreak = useCallback(
    (streak: number) => {
      if (!user) return;

      const oldStreak = user.streak;

      setUser({
        ...user,
        streak,
      });

      // Analytics: Track streak update
      analytics.track(AnalyticsEvents.STREAK_UPDATED, {
        user_id: user.id,
        old_streak: oldStreak,
        new_streak: streak,
        streak_change: streak - oldStreak,
      });
    },
    [user, analytics]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('No hay usuario autenticado');

      try {
        const updatedProfile = await AuthService.updateUserProfile(
          user.id,
          updates
        );

        setUser({
          ...user,
          ...updatedProfile,
        });
      } catch (error) {
        logger.error(LogModule.AUTH, 'Error actualizando perfil', error);
        throw error;
      }
    },
    [user]
  );

  const refreshUser = useCallback(async () => {
    if (!supabaseUser) return;

    const userData = await loadUserData(supabaseUser);
    if (userData) {
      setUser(userData.user);
      setIsPremium(userData.isPremium);
    }
  }, [supabaseUser, loadUserData]);

  const clearRateLimitError = useCallback(() => {
    setRateLimitError(null);
  }, []);

  const value: AuthContextType = {
    user,
    supabaseUser,
    isAuthenticated,
    isLoading,
    isPremium,
    rateLimitError,
    login,
    signup,
    logout,
    updateUserXP,
    updateStreak,
    updateProfile,
    clearRateLimitError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
