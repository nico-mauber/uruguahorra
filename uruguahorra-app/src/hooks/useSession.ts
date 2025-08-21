import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts';
import { AuthService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: unknown;
  error: string | null;
  lastRefresh: Date | null;
}

interface UseSessionOptions {
  autoRefreshOnFocus?: boolean;
  refreshInterval?: number; // minutes
}

export function useSession(options: UseSessionOptions = {}) {
  const { autoRefreshOnFocus = true, refreshInterval = 30 } = options;

  const { user, isAuthenticated, isLoading } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
    lastRefresh: null,
  });

  // Update session state when auth store changes
  useEffect(() => {
    setSessionState((prev) => ({
      ...prev,
      isLoading,
      isAuthenticated,
      user,
      error: null,
      // Solo actualizar lastRefresh si realmente cambió el estado de autenticación
      lastRefresh: prev.isAuthenticated !== isAuthenticated ? new Date() : prev.lastRefresh,
    }));
  }, [isLoading, isAuthenticated, user]);

  // Refresh session function
  const refreshSession = useCallback(async () => {
    try {
      logger.info(LogModule.AUTH, 'Refreshing session manually');

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error(LogModule.AUTH, 'Session refresh failed', error);
        setSessionState((prev) => ({
          ...prev,
          error: error.message,
        }));
        return false;
      }

      if (data.session) {
        logger.success(LogModule.AUTH, 'Session refreshed successfully');
        // Session is automatically updated by the AuthProvider
        setSessionState((prev) => ({
          ...prev,
          error: null,
          lastRefresh: new Date(),
        }));
        return true;
      }

      return false;
    } catch (error: unknown) {
      logger.error(LogModule.AUTH, 'Session refresh error', error);
      setSessionState((prev) => ({
        ...prev,
        error: (error as Error)?.message || 'Unknown error',
      }));
      return false;
    }
  }, []);

  // Check if session needs refresh
  const shouldRefresh = useCallback(() => {
    if (!sessionState.lastRefresh) return true;

    const now = new Date();
    const timeDiff = now.getTime() - sessionState.lastRefresh.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff >= refreshInterval;
  }, [sessionState.lastRefresh, refreshInterval]);

  // Auto refresh on app focus
  useEffect(() => {
    if (!autoRefreshOnFocus) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && shouldRefresh()) {
        logger.info(LogModule.AUTH, 'App became active, refreshing session');
        await refreshSession();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, [autoRefreshOnFocus, isAuthenticated, shouldRefresh, refreshSession]);

  // Periodic refresh
  useEffect(() => {
    if (!isAuthenticated || refreshInterval <= 0) return;

    const interval = setInterval(
      () => {
        if (shouldRefresh()) {
          logger.info(LogModule.AUTH, 'Periodic session refresh triggered');
          refreshSession();
        }
      },
      refreshInterval * 60 * 1000
    ); // Convert minutes to milliseconds

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshInterval, shouldRefresh, refreshSession]);

  // Session validation
  const validateSession = useCallback(async () => {
    try {
      logger.debug(LogModule.AUTH, 'Validating current session');

      const session = await AuthService.getSession();

      if (!session) {
        logger.warn(LogModule.AUTH, 'No valid session found');
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;

      if (expiresAt <= now) {
        logger.warn(LogModule.AUTH, 'Session token expired');
        await refreshSession();
        return false;
      }

      logger.success(LogModule.AUTH, 'Session is valid');
      return true;
    } catch (error: unknown) {
      logger.error(LogModule.AUTH, 'Session validation failed', error);
      return false;
    }
  }, [refreshSession]);

  // Force session check
  const forceRefresh = useCallback(async () => {
    logger.info(LogModule.AUTH, 'Forcing session refresh');
    setSessionState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Just refresh the session, AuthProvider handles the rest
      await refreshSession();
    } catch (error: unknown) {
      logger.error(LogModule.AUTH, 'Force refresh failed', error);
      setSessionState((prev) => ({
        ...prev,
        error: (error as Error)?.message || 'Unknown error',
        isLoading: false,
      }));
    }
  }, [refreshSession]);

  // Get session info
  const getSessionInfo = useCallback(async () => {
    try {
      const session = await AuthService.getSession();

      if (!session) return null;

      return {
        userId: session.user?.id,
        email: session.user?.email,
        expiresAt: new Date(session.expires_at! * 1000),
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      };
    } catch (error: unknown) {
      logger.error(LogModule.AUTH, 'Failed to get session info', error);
      return null;
    }
  }, []);

  // Initial session check - not needed anymore, AuthProvider handles this
  useEffect(() => {
    // AuthProvider already handles initial session loading
    // This effect is no longer needed
  }, []);

  return {
    // Session state
    isLoading: sessionState.isLoading,
    isAuthenticated: sessionState.isAuthenticated,
    user: sessionState.user,
    error: sessionState.error,
    lastRefresh: sessionState.lastRefresh,

    // Session actions
    refreshSession,
    validateSession,
    forceRefresh,
    getSessionInfo,

    // Utilities
    shouldRefresh: shouldRefresh(),
    isExpired: sessionState.lastRefresh
      ? (new Date().getTime() - sessionState.lastRefresh.getTime()) /
          (1000 * 60) >
        refreshInterval
      : true,
  };
}

export default useSession;
