export { AuthProvider, useAuth } from './AuthContext';

// Hook de compatibilidad para facilitar la migración
export const useAuthStore = () => {
  const auth = useAuth();
  
  return {
    // Estados
    user: auth.user,
    supabaseUser: auth.supabaseUser,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isPremium: auth.isPremium,
    rateLimitError: auth.rateLimitError,
    
    // Métodos
    login: auth.login,
    signup: auth.signup,
    logout: auth.logout,
    updateUserXP: auth.updateUserXP,
    updateStreak: auth.updateStreak,
    updateProfile: auth.updateProfile,
    clearRateLimitError: auth.clearRateLimitError,
    refreshUser: auth.refreshUser,
    
    // Método de compatibilidad (deprecado)
    checkSession: async () => {
      console.warn('checkSession is deprecated. Use AuthProvider initialization instead.');
      await auth.refreshUser();
    },
  };
};
