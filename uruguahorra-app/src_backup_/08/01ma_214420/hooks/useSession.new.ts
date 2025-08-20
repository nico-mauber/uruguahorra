import { useAuth } from '@/contexts';
import { logger, LogModule } from '@/utils/logger';

interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: unknown;
  error: string | null;
  lastRefresh: Date | null;
}

/**
 * Hook simplificado que usa el AuthProvider
 * Ya no necesitamos manejar manualmente las sesiones
 */
export function useSession() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    rateLimitError,
    refreshUser 
  } = useAuth();

  const sessionState: SessionState = {
    isLoading,
    isAuthenticated,
    user,
    error: rateLimitError,
    lastRefresh: new Date(), // El AuthProvider maneja esto internamente
  };

  // Función para refrescar manualmente si es necesario
  const refreshSession = async () => {
    try {
      logger.info(LogModule.AUTH, 'Refreshing user data manually');
      await refreshUser();
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error refreshing user data', error);
    }
  };

  return {
    ...sessionState,
    refreshSession,
    // Métodos de autenticación disponibles directamente
    user,
    isAuthenticated,
    isLoading,
    error: rateLimitError,
  };
}

/**
 * Nota: Este hook ahora es mucho más simple porque:
 * 
 * 1. No necesitamos AppState listeners - el AuthProvider los maneja
 * 2. No necesitamos intervalos de refresh - automático en AuthProvider  
 * 3. No necesitamos checkSession manual - se hace automáticamente
 * 4. No necesitamos manejar auth state changes - AuthProvider los maneja
 * 5. Menos código = menos bugs = mejor rendimiento
 * 
 * El 90% de la lógica original era innecesaria con AuthProvider.
 */
