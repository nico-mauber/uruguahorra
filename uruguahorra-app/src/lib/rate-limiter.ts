/**
 * Sistema de Rate Limiting robusto para protección contra ataques de fuerza bruta
 * Implementa algoritmo de ventana deslizante con exponential backoff
 */

import { logger, LogModule } from '@/utils/logger';
import { RateLimiterStorage } from './rate-limiter-storage';

/**
 * Configuración de rate limiting por tipo de acción
 */
export interface RateLimitConfig {
  maxAttempts: number; // Máximo número de intentos permitidos
  windowMs: number; // Ventana de tiempo en milisegundos
  blockDurationMs: number; // Duración del bloqueo tras exceder límite
  exponentialBase?: number; // Base para exponential backoff (default: 2)
  enableFingerprint?: boolean; // Habilitar tracking por fingerprint del dispositivo
}

/**
 * Registro de un intento
 */
interface AttemptRecord {
  timestamp: number;
  identifier: string;
  action: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Estado del rate limiting para un identificador
 */
export interface RateLimitState {
  isBlocked: boolean;
  remainingAttempts: number;
  resetTime: number; // Timestamp cuando se resetea el límite
  blockUntil?: number; // Timestamp hasta cuando está bloqueado
  retryAfterMs?: number; // Milisegundos hasta poder reintentar
  message?: string; // Mensaje para el usuario
}

/**
 * Configuraciones predefinidas para diferentes acciones
 */
export const RATE_LIMIT_CONFIGS = {
  // Login/SignIn - Más restrictivo
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 30 * 60 * 1000, // 30 minutos de bloqueo
    exponentialBase: 2,
    enableFingerprint: true,
  } as RateLimitConfig,

  // Registro - Moderado
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 60 * 60 * 1000, // 1 hora de bloqueo
    exponentialBase: 2,
    enableFingerprint: true,
  } as RateLimitConfig,

  // Reset Password - Restrictivo para prevenir spam
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 horas de bloqueo
    exponentialBase: 3,
    enableFingerprint: false,
  } as RateLimitConfig,

  // OTP Verification - Muy restrictivo
  otpVerification: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutos
    blockDurationMs: 60 * 60 * 1000, // 1 hora de bloqueo
    exponentialBase: 2,
    enableFingerprint: true,
  } as RateLimitConfig,

  // API genérica - Menos restrictivo
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueo
    exponentialBase: 1.5,
    enableFingerprint: false,
  } as RateLimitConfig,
};

/**
 * Clase principal de Rate Limiting
 */
export class RateLimiter {
  private static instance: RateLimiter;
  private storage: RateLimiterStorage;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.storage = RateLimiterStorage.getInstance();
    this.startAutoCleanup();
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Verifica si una acción está permitida
   */
  async checkLimit(
    action: keyof typeof RATE_LIMIT_CONFIGS | string,
    identifier: string,
    customConfig?: RateLimitConfig
  ): Promise<RateLimitState> {
    try {
      // Obtener configuración
      const config =
        customConfig ||
        RATE_LIMIT_CONFIGS[action as keyof typeof RATE_LIMIT_CONFIGS];
      if (!config) {
        throw new Error(`No rate limit config found for action: ${action}`);
      }

      // Generar identificador compuesto si se usa fingerprint
      let compositeIdentifier = identifier;
      if (config.enableFingerprint) {
        // Por ahora, usar un fingerprint simple basado en el user agent
        // En el futuro se puede mejorar con una implementación más robusta
        const simpleFingerprint =
          typeof window !== 'undefined'
            ? btoa(window.navigator.userAgent || 'unknown').substring(0, 16)
            : 'server';
        compositeIdentifier = `${identifier}:${simpleFingerprint}`;
      }

      // Obtener intentos recientes
      const attempts = await this.storage.getAttempts(
        action,
        compositeIdentifier
      );
      const now = Date.now();

      // Filtrar intentos dentro de la ventana de tiempo
      const recentAttempts = attempts.filter(
        (attempt) => now - attempt.timestamp < config.windowMs
      );

      // Verificar si está en período de bloqueo
      const lastBlockedAttempt = attempts.find(
        (attempt) =>
          attempt.metadata?.blocked === true &&
          now - attempt.timestamp < config.blockDurationMs
      );

      if (lastBlockedAttempt) {
        const blockUntil =
          lastBlockedAttempt.timestamp + config.blockDurationMs;
        const retryAfterMs = blockUntil - now;

        // Aplicar exponential backoff si está configurado
        const backoffMultiplier = this.calculateBackoff(
          recentAttempts.length,
          config.exponentialBase || 1
        );
        const adjustedRetryAfterMs = Math.min(
          retryAfterMs * backoffMultiplier,
          config.blockDurationMs * 3 // Máximo 3x el bloqueo base
        );

        return {
          isBlocked: true,
          remainingAttempts: 0,
          resetTime: blockUntil,
          blockUntil,
          retryAfterMs: adjustedRetryAfterMs,
          message: this.getBlockedMessage(adjustedRetryAfterMs),
        };
      }

      // Calcular intentos restantes
      const remainingAttempts = Math.max(
        0,
        config.maxAttempts - recentAttempts.length
      );
      const resetTime =
        recentAttempts.length > 0
          ? recentAttempts[0].timestamp + config.windowMs
          : now + config.windowMs;

      // Si excede el límite, crear bloqueo
      if (remainingAttempts === 0) {
        await this.recordAttempt(action, compositeIdentifier, false, {
          blocked: true,
        });

        const retryAfterMs = config.blockDurationMs;
        return {
          isBlocked: true,
          remainingAttempts: 0,
          resetTime: now + config.blockDurationMs,
          blockUntil: now + config.blockDurationMs,
          retryAfterMs,
          message: this.getBlockedMessage(retryAfterMs),
        };
      }

      return {
        isBlocked: false,
        remainingAttempts,
        resetTime,
        message:
          remainingAttempts <= 2
            ? `${remainingAttempts} intentos restantes`
            : undefined,
      };
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error checking rate limit', error);
      // En caso de error, permitir la acción pero loguear
      return {
        isBlocked: false,
        remainingAttempts: 1,
        resetTime: Date.now() + 60000,
      };
    }
  }

  /**
   * Registra un intento
   */
  async recordAttempt(
    action: string,
    identifier: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const config =
        RATE_LIMIT_CONFIGS[action as keyof typeof RATE_LIMIT_CONFIGS];

      // Generar identificador compuesto si se usa fingerprint
      let compositeIdentifier = identifier;
      if (config?.enableFingerprint) {
        // Usar un fingerprint simple basado en el user agent
        const simpleFingerprint =
          typeof window !== 'undefined'
            ? btoa(window.navigator.userAgent || 'unknown').substring(0, 16)
            : 'server';
        compositeIdentifier = `${identifier}:${simpleFingerprint}`;
      }

      const attempt: AttemptRecord = {
        timestamp: Date.now(),
        identifier: compositeIdentifier,
        action,
        success,
        metadata,
      };

      await this.storage.addAttempt(attempt);

      // Log de seguridad para intentos fallidos
      if (!success) {
        logger.warn(LogModule.AUTH, 'Failed authentication attempt', {
          action,
          identifier: identifier.substring(0, 3) + '***', // Ofuscar identificador
          metadata,
        });
      }

      // Si es exitoso, limpiar intentos previos para este identificador
      if (success) {
        await this.storage.clearAttempts(action, compositeIdentifier);
      }
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error recording attempt', error);
    }
  }

  /**
   * Limpia intentos para un identificador específico
   */
  async clearAttempts(action: string, identifier: string): Promise<void> {
    try {
      const config =
        RATE_LIMIT_CONFIGS[action as keyof typeof RATE_LIMIT_CONFIGS];

      // Generar identificador compuesto si se usa fingerprint
      let compositeIdentifier = identifier;
      if (config?.enableFingerprint) {
        // Usar un fingerprint simple basado en el user agent
        const simpleFingerprint =
          typeof window !== 'undefined'
            ? btoa(window.navigator.userAgent || 'unknown').substring(0, 16)
            : 'server';
        compositeIdentifier = `${identifier}:${simpleFingerprint}`;
      }

      await this.storage.clearAttempts(action, compositeIdentifier);
      logger.info(LogModule.AUTH, 'Cleared rate limit attempts', {
        action,
        identifier: identifier.substring(0, 3) + '***',
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error clearing attempts', error);
    }
  }

  /**
   * Calcula el multiplicador de backoff exponencial
   */
  private calculateBackoff(attemptCount: number, base: number): number {
    if (base <= 1) return 1;
    return Math.pow(base, Math.min(attemptCount - 1, 5)); // Máximo 5 exponentes
  }

  /**
   * Genera mensaje amigable para usuario bloqueado
   */
  private getBlockedMessage(retryAfterMs: number): string {
    const seconds = Math.ceil(retryAfterMs / 1000);
    const minutes = Math.ceil(seconds / 60);
    const hours = Math.ceil(minutes / 60);

    if (hours > 1) {
      return `Demasiados intentos. Por favor, intenta nuevamente en ${hours} horas.`;
    } else if (minutes > 1) {
      return `Demasiados intentos. Por favor, intenta nuevamente en ${minutes} minutos.`;
    } else {
      return `Demasiados intentos. Por favor, intenta nuevamente en ${seconds} segundos.`;
    }
  }

  /**
   * Inicia limpieza automática de registros antiguos
   */
  private startAutoCleanup(): void {
    // Limpiar cada hora
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldAttempts();
      },
      60 * 60 * 1000
    );

    // Limpieza inicial
    this.cleanupOldAttempts();
  }

  /**
   * Limpia intentos antiguos
   */
  private async cleanupOldAttempts(): Promise<void> {
    try {
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      const cleaned = await this.storage.cleanupOldAttempts(maxAge);

      if (cleaned > 0) {
        logger.debug(LogModule.AUTH, 'Cleaned old rate limit attempts', {
          count: cleaned,
        });
      }
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error cleaning old attempts', error);
    }
  }

  /**
   * Detiene la limpieza automática
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
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
    return await this.storage.getStats();
  }
}
