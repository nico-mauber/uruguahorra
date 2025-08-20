import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { logger, LogModule } from '@/utils/logger';

/**
 * Hook optimizado que evita múltiples llamadas checkSession
 */
export function useOptimizedAuth() {
  const checkSessionRef = useRef<boolean>(false);
  const {
    user,
    isLoading,
    isAuthenticated,
    isPremium,
    rateLimitError,
    checkSession,
  } = useAuthStore();

  useEffect(() => {
    // Solo ejecutar checkSession una vez al montar el componente
    if (!checkSessionRef.current && !user && !isLoading) {
      logger.info(LogModule.AUTH, 'Ejecutando checkSession inicial optimizado');
      checkSessionRef.current = true;
      checkSession().finally(() => {
        // Permitir futuras llamadas solo si es necesario
        setTimeout(() => {
          checkSessionRef.current = false;
        }, 30000); // Reset después de 30 segundos
      });
    }
  }, [checkSession, user, isLoading]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isPremium,
    rateLimitError,
  };
}
