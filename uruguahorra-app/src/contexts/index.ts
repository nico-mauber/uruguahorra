// Usar el nuevo SimpleAuthContext en lugar del antiguo AuthContext
import {
  useAuth as useAuthHook,
  SimpleAuthProvider as AuthProvider,
} from './SimpleAuthContext';

// Re-export for direct usage con los mismos nombres para compatibilidad
export { AuthProvider };
export const useAuth = useAuthHook;

/**
 * Hook de compatibilidad para migración COMPLETA
 * Redirige 100% al AuthProvider - NO usa useAuthStore para evitar duplicación
 */
export const useAuthStore = () => {
  console.warn(
    '⚠️ DEPRECATION WARNING: useAuthStore is deprecated. Use useAuth instead.\n' +
      'This hook now redirects to AuthProvider to avoid duplicate calls.\n' +
      'Please migrate to: import { useAuth } from "@/contexts"'
  );

  const auth = useAuthHook();

  return {
    // Estados (100% desde AuthProvider)
    user: auth.user,
    supabaseUser: auth.supabaseUser,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isPremium: auth.isPremium,
    rateLimitError: auth.rateLimitError,

    // Métodos (100% desde AuthProvider)
    login: auth.login,
    signup: auth.signup,
    logout: auth.logout,
    updateUserXP: auth.updateUserXP,
    updateStreak: auth.updateStreak,
    updateProfile: auth.updateProfile,
    clearRateLimitError: auth.clearRateLimitError,

    // Métodos deprecados (con warnings)
    checkSession: async () => {
      console.warn(
        '⚠️ checkSession() is deprecated and does nothing.\n' +
          'AuthProvider handles session management automatically.\n' +
          'Remove this call from your code.'
      );
      // NO hacer nada - AuthProvider ya maneja todo
    },

    // Método para refrescar datos si es absolutamente necesario
    refreshUser: auth.refreshUser,

    // Helper para migración
    setUser: (_user: unknown) => {
      console.warn(
        '⚠️ setUser() is deprecated and does nothing.\n' +
          'AuthProvider manages user state automatically.\n' +
          'Remove this call from your code.'
      );
      // NO hacer nada - AuthProvider maneja el estado
    },
  };
};
