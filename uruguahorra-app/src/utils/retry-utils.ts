/**
 * Sistema de retry con exponential backoff y jitter
 * Resuelve CWE-362: Concurrent Execution using Shared Resource
 *
 * Implementa las mejores prácticas de 2024 para manejo de
 * reintentos en sistemas distribuidos con race conditions
 */

import { logger, LogModule } from './logger';

/**
 * Configuración para estrategia de retry
 */
export interface RetryConfig {
  /**
   * Número máximo de intentos (incluyendo el inicial)
   */
  maxAttempts: number;

  /**
   * Delay inicial en milisegundos
   */
  initialDelay: number;

  /**
   * Delay máximo en milisegundos (cap)
   */
  maxDelay: number;

  /**
   * Multiplicador para exponential backoff
   */
  backoffMultiplier: number;

  /**
   * Factor de jitter (0-1). 0 = sin jitter, 1 = jitter máximo
   */
  jitterFactor: number;

  /**
   * Timeout total para todos los intentos en milisegundos
   */
  timeout: number;

  /**
   * Callback ejecutado antes de cada reintento
   */
  onRetry?: (attempt: number, delay: number, error?: unknown) => void;

  /**
   * Función para determinar si un error es recuperable
   */
  shouldRetry?: (error: unknown) => boolean;

  /**
   * Nombre de la operación para logging
   */
  operationName?: string;
}

/**
 * Configuración por defecto para retry
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitterFactor: 0.3,
  timeout: 30000,
  operationName: 'operation',
};

/**
 * Errores que típicamente son recuperables
 */
const RETRYABLE_ERROR_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  '503', // Service Unavailable
  '502', // Bad Gateway
  '504', // Gateway Timeout
  '429', // Too Many Requests
  'PGRST116', // Supabase: Not Found (puede que todavía no exista)
];

/**
 * Determina si un error es recuperable por defecto
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Error con código específico
  if (typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code);
    if (RETRYABLE_ERROR_CODES.includes(code)) {
      return true;
    }
  }

  // Error con status HTTP
  if (typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);
    // Errores 5xx son generalmente recuperables
    if (status >= 500 && status < 600) {
      return true;
    }
    // 429 Too Many Requests es recuperable con backoff
    if (status === 429) {
      return true;
    }
  }

  // Error con mensaje específico
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporarily')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calcula el delay con exponential backoff y jitter
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const { initialDelay, maxDelay, backoffMultiplier, jitterFactor } = config;

  // Exponential backoff
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  // Cap al máximo
  delay = Math.min(delay, maxDelay);

  // Agregar jitter
  if (jitterFactor > 0) {
    const jitter = delay * jitterFactor * Math.random();
    // Jitter puede ser positivo o negativo para mejor distribución
    delay = delay + jitter * (Math.random() > 0.5 ? 1 : -1);
    // Asegurar que no sea negativo
    delay = Math.max(delay, 1);
  }

  return Math.round(delay);
}

/**
 * Ejecuta una función con retry usando exponential backoff y jitter
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const { maxAttempts, timeout, onRetry, shouldRetry, operationName } =
    finalConfig;

  const startTime = Date.now();
  let lastError: unknown;

  // Log inicial
  logger.debug(LogModule.RETRY, `Starting ${operationName} with retry`, {
    maxAttempts,
    timeout,
    config: finalConfig,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Verificar timeout global
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= timeout) {
        logger.error(LogModule.RETRY, `${operationName} timeout exceeded`, {
          elapsedTime,
          timeout,
          attempts: attempt - 1,
        });
        throw new Error(
          `Timeout exceeded for ${operationName} after ${elapsedTime}ms`
        );
      }

      // Calcular timeout restante para este intento
      const remainingTimeout = timeout - elapsedTime;

      // Ejecutar la función con timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`${operationName} attempt ${attempt} timed out`)
              ),
            remainingTimeout
          )
        ),
      ]);

      // Éxito!
      if (attempt > 1) {
        logger.success(
          LogModule.RETRY,
          `${operationName} succeeded after retry`,
          {
            attempt,
            totalTime: Date.now() - startTime,
          }
        );
      }

      return result;
    } catch (error) {
      lastError = error;

      // Verificar si es el último intento
      if (attempt === maxAttempts) {
        logger.error(
          LogModule.RETRY,
          `${operationName} failed after all attempts`,
          {
            attempts: maxAttempts,
            totalTime: Date.now() - startTime,
            lastError: error instanceof Error ? error.message : String(error),
          }
        );
        break;
      }

      // Verificar si el error es recuperable
      const isRetryable = shouldRetry
        ? shouldRetry(error)
        : isRetryableError(error);

      if (!isRetryable) {
        logger.warn(
          LogModule.RETRY,
          `${operationName} failed with non-retryable error`,
          {
            attempt,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        break;
      }

      // Calcular delay para el próximo intento
      const delay = calculateDelay(attempt, finalConfig);

      // Log del reintento
      logger.info(LogModule.RETRY, `Retrying ${operationName}`, {
        attempt,
        nextAttempt: attempt + 1,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Callback antes del reintento
      if (onRetry) {
        onRetry(attempt, delay, error);
      }

      // Esperar antes del próximo intento
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  throw lastError;
}

/**
 * Token bucket para rate limiting de reintentos
 * Previene retry storms en caso de fallos masivos
 */
export class RetryRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens por segundo

  constructor(maxTokens: number = 10, refillRate: number = 1) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Intenta consumir un token para retry
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Rellena tokens basado en el tiempo transcurrido
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // en segundos
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Obtiene el número de tokens disponibles
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Configuraciones predefinidas para casos comunes
 */
export const RETRY_CONFIGS = {
  /**
   * Para operaciones rápidas que deben responder pronto
   */
  FAST: {
    maxAttempts: 3,
    initialDelay: 50,
    maxDelay: 500,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    timeout: 5000,
  } as RetryConfig,

  /**
   * Para operaciones de red normales
   */
  STANDARD: {
    maxAttempts: 5,
    initialDelay: 100,
    maxDelay: 3000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
    timeout: 15000,
  } as RetryConfig,

  /**
   * Para operaciones de sincronización de datos
   */
  SYNC: {
    maxAttempts: 7,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.3,
    timeout: 30000,
  } as RetryConfig,

  /**
   * Para operaciones en background
   */
  BACKGROUND: {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.4,
    timeout: 120000,
  } as RetryConfig,
};

/**
 * Helper para ejecutar una función con retry y rate limiting
 */
export async function retryWithRateLimit<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  rateLimiter?: RetryRateLimiter
): Promise<T> {
  // Si hay rate limiter, verificar tokens
  if (rateLimiter && !rateLimiter.tryConsume()) {
    const available = rateLimiter.getAvailableTokens();
    logger.warn(LogModule.RETRY, 'Rate limit exceeded for retries', {
      availableTokens: available,
      operationName: config.operationName,
    });
    throw new Error(`Rate limit exceeded. ${available} tokens available.`);
  }

  return withExponentialBackoff(fn, config);
}
