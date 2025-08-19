/**
 * Storage persistence layer para el sistema de Rate Limiting
 * Maneja el almacenamiento seguro de intentos y estado de bloqueos
 */

import { storage } from '@/lib/storage';
import { logger, LogModule } from '@/utils/logger';
import { Platform } from 'react-native';

/**
 * Registro de un intento almacenado
 */
interface StoredAttempt {
  timestamp: number;
  identifier: string;
  action: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Estructura de datos almacenada
 */
interface RateLimitData {
  attempts: StoredAttempt[];
  blockedUntil?: number;
  lastCleanup: number;
}

/**
 * Clase singleton para gestionar el almacenamiento del rate limiter
 */
export class RateLimiterStorage {
  private static instance: RateLimiterStorage;
  private readonly STORAGE_KEY_PREFIX = 'rate_limit_';
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora
  private memoryCache: Map<string, RateLimitData> = new Map();
  private isWeb = Platform.OS === 'web';

  private constructor() {
    // Cargar datos existentes en memoria al inicializar
    this.loadAllData();
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): RateLimiterStorage {
    if (!RateLimiterStorage.instance) {
      RateLimiterStorage.instance = new RateLimiterStorage();
    }
    return RateLimiterStorage.instance;
  }

  /**
   * Genera la clave de almacenamiento para una acción e identificador
   */
  private getStorageKey(action: string, identifier: string): string {
    // Sanitizar el identificador para evitar caracteres problemáticos
    const sanitizedId = identifier.replace(/[^a-zA-Z0-9-_:.]/g, '_');
    const sanitizedAction = action.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${this.STORAGE_KEY_PREFIX}${sanitizedAction}_${sanitizedId}`;
  }

  /**
   * Obtiene todos los intentos para una acción e identificador
   */
  async getAttempts(
    action: string,
    identifier: string
  ): Promise<StoredAttempt[]> {
    try {
      const key = this.getStorageKey(action, identifier);

      // Intentar primero desde cache en memoria
      const cachedData = this.memoryCache.get(key);
      if (cachedData) {
        return cachedData.attempts || [];
      }

      // Si no está en cache, cargar desde storage
      const storedData = await storage.getItem(key);
      if (!storedData) {
        return [];
      }

      const data: RateLimitData = JSON.parse(storedData);

      // Actualizar cache en memoria
      this.memoryCache.set(key, data);

      return data.attempts || [];
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error getting rate limit attempts', {
        action,
        identifier: identifier.substring(0, 3) + '***',
        error,
      });
      return [];
    }
  }

  /**
   * Añade un nuevo intento
   */
  async addAttempt(attempt: StoredAttempt): Promise<void> {
    try {
      const key = this.getStorageKey(attempt.action, attempt.identifier);

      // Obtener datos existentes
      let data: RateLimitData = this.memoryCache.get(key) || {
        attempts: [],
        lastCleanup: Date.now(),
      };

      // Si los datos vienen del storage, parsearlos
      if (!this.memoryCache.has(key)) {
        const storedData = await storage.getItem(key);
        if (storedData) {
          data = JSON.parse(storedData);
        }
      }

      // Añadir el nuevo intento
      data.attempts.push(attempt);

      // Si el intento incluye metadata de bloqueo, actualizar
      if (attempt.metadata?.blocked === true) {
        const blockDuration =
          (attempt.metadata.blockDurationMs as number) || 30 * 60 * 1000;
        data.blockedUntil = attempt.timestamp + blockDuration;
      }

      // Limpiar intentos antiguos si ha pasado suficiente tiempo
      const now = Date.now();
      if (now - data.lastCleanup > this.CLEANUP_INTERVAL) {
        data.attempts = this.cleanupAttempts(data.attempts);
        data.lastCleanup = now;
      }

      // Actualizar cache en memoria
      this.memoryCache.set(key, data);

      // Persistir a storage
      await storage.setItem(key, JSON.stringify(data));

      logger.debug(LogModule.AUTH, 'Rate limit attempt recorded', {
        action: attempt.action,
        success: attempt.success,
        totalAttempts: data.attempts.length,
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error adding rate limit attempt', {
        action: attempt.action,
        error,
      });
    }
  }

  /**
   * Limpia todos los intentos para una acción e identificador
   */
  async clearAttempts(action: string, identifier: string): Promise<void> {
    try {
      const key = this.getStorageKey(action, identifier);

      // Limpiar de memoria
      this.memoryCache.delete(key);

      // Limpiar de storage
      await storage.removeItem(key);

      logger.debug(LogModule.AUTH, 'Rate limit attempts cleared', {
        action,
        identifier: identifier.substring(0, 3) + '***',
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error clearing rate limit attempts', {
        action,
        error,
      });
    }
  }

  /**
   * Limpia intentos antiguos de toda la aplicación
   */
  async cleanupOldAttempts(maxAge: number): Promise<number> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Limpiar cache en memoria
      for (const [, data] of this.memoryCache.entries()) {
        const originalCount = data.attempts.length;
        data.attempts = data.attempts.filter(
          (attempt) => now - attempt.timestamp < maxAge
        );

        const cleaned = originalCount - data.attempts.length;
        if (cleaned > 0) {
          cleanedCount += cleaned;

          // Si no quedan intentos, eliminar completamente
          if (data.attempts.length === 0) {
            this.memoryCache.delete(key);
            await storage.removeItem(key);
          } else {
            // Actualizar con los intentos filtrados
            data.lastCleanup = now;
            this.memoryCache.set(key, data);
            await storage.setItem(key, JSON.stringify(data));
          }
        }
      }

      // En web, también limpiar directamente del localStorage
      if (this.isWeb && typeof localStorage !== 'undefined') {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
            try {
              const storedData = localStorage.getItem(key);
              if (storedData) {
                const data: RateLimitData = JSON.parse(storedData);
                const originalCount = data.attempts?.length || 0;

                if (data.attempts) {
                  data.attempts = data.attempts.filter(
                    (attempt) => now - attempt.timestamp < maxAge
                  );

                  const cleaned = originalCount - data.attempts.length;
                  if (cleaned > 0) {
                    cleanedCount += cleaned;

                    if (data.attempts.length === 0) {
                      localStorage.removeItem(key);
                    } else {
                      data.lastCleanup = now;
                      localStorage.setItem(key, JSON.stringify(data));
                    }
                  }
                }
              }
            } catch {
              // Ignorar errores de parsing en elementos individuales
            }
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error cleaning old attempts', error);
      return 0;
    }
  }

  /**
   * Limpia intentos antiguos de un array
   */
  private cleanupAttempts(
    attempts: StoredAttempt[],
    maxAge: number = 24 * 60 * 60 * 1000
  ): StoredAttempt[] {
    const now = Date.now();
    return attempts.filter((attempt) => now - attempt.timestamp < maxAge);
  }

  /**
   * Carga todos los datos de rate limiting en memoria al iniciar
   */
  private async loadAllData(): Promise<void> {
    try {
      if (this.isWeb && typeof localStorage !== 'undefined') {
        const keys = Object.keys(localStorage);
        for (const storageKey of keys) {
          if (storageKey.startsWith(this.STORAGE_KEY_PREFIX)) {
            try {
              const data = localStorage.getItem(storageKey);
              if (data) {
                this.memoryCache.set(storageKey, JSON.parse(data));
              }
            } catch {
              // Ignorar errores de parsing
            }
          }
        }

        logger.debug(LogModule.AUTH, 'Rate limit data loaded', {
          entriesLoaded: this.memoryCache.size,
        });
      }
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error loading rate limit data', error);
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
    try {
      let totalAttempts = 0;
      let blockedIdentifiers = 0;
      const attemptsByAction: Record<string, number> = {};
      const now = Date.now();

      for (const [, data] of this.memoryCache.entries()) {
        // Contar intentos totales
        totalAttempts += data.attempts.length;

        // Verificar si está bloqueado
        if (data.blockedUntil && data.blockedUntil > now) {
          blockedIdentifiers++;
        }

        // Contar por acción
        if (data.attempts.length > 0) {
          const action = data.attempts[0].action;
          attemptsByAction[action] =
            (attemptsByAction[action] || 0) + data.attempts.length;
        }
      }

      return {
        totalAttempts,
        blockedIdentifiers,
        attemptsByAction,
      };
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error getting rate limit stats', error);
      return {
        totalAttempts: 0,
        blockedIdentifiers: 0,
        attemptsByAction: {},
      };
    }
  }

  /**
   * Resetea todo el almacenamiento (solo para testing)
   */
  async reset(): Promise<void> {
    if (__DEV__) {
      try {
        // Limpiar memoria
        this.memoryCache.clear();

        // Limpiar storage
        if (this.isWeb && typeof localStorage !== 'undefined') {
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
              localStorage.removeItem(key);
            }
          }
        }

        logger.warn(LogModule.AUTH, 'Rate limiter storage reset');
      } catch (error) {
        logger.error(
          LogModule.AUTH,
          'Error resetting rate limiter storage',
          error
        );
      }
    }
  }
}
