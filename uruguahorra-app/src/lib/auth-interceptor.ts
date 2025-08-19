/**
 * Interceptor de autenticación con Rate Limiting integrado
 * Protege todas las operaciones de autenticación contra ataques de fuerza bruta
 */

import { RateLimiter, RateLimitState } from './rate-limiter';
import { logger, LogModule } from '@/utils/logger';
import { Alert, Platform } from 'react-native';

/**
 * Tipo de operación de autenticación
 */
export type AuthOperation =
  | 'login'
  | 'signup'
  | 'passwordReset'
  | 'otpVerification';

/**
 * Resultado de la verificación de rate limiting
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  state: RateLimitState;
  showAlert?: boolean;
}

/**
 * Error personalizado para rate limiting
 */
export class RateLimitError extends Error {
  public readonly retryAfterMs: number;
  public readonly remainingAttempts: number;
  public readonly resetTime: number;

  constructor(state: RateLimitState) {
    const message =
      state.message || 'Demasiados intentos. Por favor, intenta más tarde.';
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = state.retryAfterMs || 0;
    this.remainingAttempts = state.remainingAttempts;
    this.resetTime = state.resetTime;
  }
}

/**
 * Clase para interceptar y proteger operaciones de autenticación
 */
export class AuthInterceptor {
  private static instance: AuthInterceptor;
  private rateLimiter: RateLimiter;
  private lastAlertTime: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN = 5000; // 5 segundos entre alertas

  private constructor() {
    this.rateLimiter = RateLimiter.getInstance();
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): AuthInterceptor {
    if (!AuthInterceptor.instance) {
      AuthInterceptor.instance = new AuthInterceptor();
    }
    return AuthInterceptor.instance;
  }

  /**
   * Verifica si una operación de autenticación está permitida
   */
  async checkAuthOperation(
    operation: AuthOperation,
    identifier: string,
    options?: {
      silent?: boolean; // No mostrar alertas
      throwOnBlock?: boolean; // Lanzar excepción si está bloqueado
    }
  ): Promise<RateLimitCheckResult> {
    try {
      // Validar entrada
      if (!identifier || identifier.trim().length === 0) {
        throw new Error('Identifier is required for rate limiting');
      }

      // Verificar rate limit
      const state = await this.rateLimiter.checkLimit(operation, identifier);

      // Si está bloqueado
      if (state.isBlocked) {
        logger.warn(LogModule.AUTH, 'Auth operation blocked by rate limiter', {
          operation,
          identifier: identifier.substring(0, 3) + '***',
          blockUntil: new Date(state.blockUntil || 0).toISOString(),
          retryAfterMs: state.retryAfterMs,
        });

        // Mostrar alerta si no está en modo silencioso
        if (!options?.silent) {
          this.showBlockedAlert(operation, state, identifier);
        }

        // Lanzar excepción si se solicita
        if (options?.throwOnBlock) {
          throw new RateLimitError(state);
        }

        return {
          allowed: false,
          state,
          showAlert: !options?.silent,
        };
      }

      // Si quedan pocos intentos, advertir
      if (state.remainingAttempts <= 2 && !options?.silent) {
        this.showWarningAlert(operation, state);
      }

      return {
        allowed: true,
        state,
        showAlert: false,
      };
    } catch (error) {
      // Si es un RateLimitError, re-lanzarlo
      if (error instanceof RateLimitError) {
        throw error;
      }

      logger.error(LogModule.AUTH, 'Error checking auth operation', {
        operation,
        error,
      });

      // En caso de error, permitir la operación pero loguear
      return {
        allowed: true,
        state: {
          isBlocked: false,
          remainingAttempts: 1,
          resetTime: Date.now() + 60000,
        },
        showAlert: false,
      };
    }
  }

  /**
   * Registra el resultado de una operación de autenticación
   */
  async recordAuthResult(
    operation: AuthOperation,
    identifier: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.rateLimiter.recordAttempt(
        operation,
        identifier,
        success,
        metadata
      );

      if (!success) {
        // Verificar el estado después del fallo
        const state = await this.rateLimiter.checkLimit(operation, identifier);

        // Si acaba de ser bloqueado, notificar
        if (state.isBlocked) {
          logger.security(
            LogModule.AUTH,
            'User blocked after multiple failed attempts',
            {
              operation,
              identifier: identifier.substring(0, 3) + '***',
              blockDurationMs: state.retryAfterMs,
            }
          );
        }
      } else {
        // Si fue exitoso, limpiar intentos previos
        await this.rateLimiter.clearAttempts(operation, identifier);
      }
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error recording auth result', {
        operation,
        success,
        error,
      });
    }
  }

  /**
   * Wrapper para operaciones de autenticación con rate limiting
   */
  async withRateLimit<T>(
    operation: AuthOperation,
    identifier: string,
    authFunction: () => Promise<T>,
    options?: {
      silent?: boolean;
      onBlocked?: (state: RateLimitState) => void;
      onWarning?: (state: RateLimitState) => void;
    }
  ): Promise<T> {
    // Verificar rate limit antes de ejecutar
    const check = await this.checkAuthOperation(operation, identifier, {
      silent: options?.silent,
      throwOnBlock: false,
    });

    if (!check.allowed) {
      // Callback personalizado si está bloqueado
      if (options?.onBlocked) {
        options.onBlocked(check.state);
      }

      throw new RateLimitError(check.state);
    }

    // Advertencia si quedan pocos intentos
    if (check.state.remainingAttempts <= 2 && options?.onWarning) {
      options.onWarning(check.state);
    }

    try {
      // Ejecutar la operación de autenticación
      const result = await authFunction();

      // Registrar éxito
      await this.recordAuthResult(operation, identifier, true);

      return result;
    } catch (error) {
      // Registrar fallo
      await this.recordAuthResult(operation, identifier, false, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-lanzar el error original
      throw error;
    }
  }

  /**
   * Muestra alerta cuando el usuario está bloqueado
   */
  private showBlockedAlert(
    operation: AuthOperation,
    state: RateLimitState,
    identifier: string
  ): void {
    // Verificar cooldown de alertas
    const lastAlert = this.lastAlertTime.get(identifier) || 0;
    const now = Date.now();

    if (now - lastAlert < this.ALERT_COOLDOWN) {
      return;
    }

    this.lastAlertTime.set(identifier, now);

    const title = this.getAlertTitle(operation);
    const message =
      state.message || 'Has excedido el número máximo de intentos.';

    if (Platform.OS === 'web') {
      // En web, usar alert nativo
      if (typeof window !== 'undefined') {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      // En móvil, usar React Native Alert
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Entendido',
            style: 'default',
          },
        ],
        {
          cancelable: true,
        }
      );
    }
  }

  /**
   * Muestra advertencia cuando quedan pocos intentos
   */
  private showWarningAlert(
    operation: AuthOperation,
    state: RateLimitState
  ): void {
    const title = this.getAlertTitle(operation);
    const message = `Te quedan ${state.remainingAttempts} intentos antes de que tu cuenta sea bloqueada temporalmente.`;

    if (Platform.OS === 'web') {
      // En web, solo loguear en consola en modo desarrollo
      if (__DEV__) {
        console.warn(`${title}: ${message}`);
      }
    } else {
      // En móvil, mostrar toast o alert suave
      Alert.alert(
        'Advertencia',
        message,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ],
        {
          cancelable: true,
        }
      );
    }
  }

  /**
   * Obtiene el título apropiado para la alerta según la operación
   */
  private getAlertTitle(operation: AuthOperation): string {
    switch (operation) {
      case 'login':
        return 'Demasiados intentos de inicio de sesión';
      case 'signup':
        return 'Demasiados intentos de registro';
      case 'passwordReset':
        return 'Demasiadas solicitudes de restablecimiento';
      case 'otpVerification':
        return 'Demasiados intentos de verificación';
      default:
        return 'Demasiados intentos';
    }
  }

  /**
   * Limpia los intentos de un usuario (para uso administrativo)
   */
  async clearUserAttempts(
    operation: AuthOperation,
    identifier: string
  ): Promise<void> {
    try {
      await this.rateLimiter.clearAttempts(operation, identifier);

      logger.info(LogModule.AUTH, 'User attempts cleared by admin', {
        operation,
        identifier: identifier.substring(0, 3) + '***',
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error clearing user attempts', {
        operation,
        error,
      });
    }
  }

  /**
   * Obtiene estadísticas del rate limiting
   */
  async getStats(): Promise<{
    totalAttempts: number;
    blockedIdentifiers: number;
    attemptsByAction: Record<string, number>;
  }> {
    return await this.rateLimiter.getStats();
  }
}

/**
 * Instancia global para uso conveniente
 */
export const authInterceptor = AuthInterceptor.getInstance();
