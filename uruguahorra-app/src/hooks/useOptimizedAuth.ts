import { useAuth } from '@/contexts';
import { logger, LogModule } from '@/utils/logger';

/**
 * Hook que antes era necesario para optimizar auth, ahora simplificado
 * El AuthProvider ya maneja todas las optimizaciones automáticamente
 */
export function useOptimizedAuth() {
  const auth = useAuth();

  // Ya no necesitamos useEffect ni lógica de optimización
  // El AuthProvider maneja todo esto automáticamente

  logger.debug(
    LogModule.AUTH,
    'useOptimizedAuth: AuthProvider ya maneja las optimizaciones'
  );

  // Retornamos directamente los datos del AuthProvider
  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    isPremium: auth.isPremium,
    rateLimitError: auth.rateLimitError,
    // Métodos de autenticación si se necesitan
    login: auth.login,
    logout: auth.logout,
    refreshUser: auth.refreshUser,
  };
}
