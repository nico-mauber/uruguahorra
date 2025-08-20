/**
 * Sistema simple de cache en memoria para optimizar llamadas a la base de datos
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en ms
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Obtener un valor del cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si el cache ha expirado
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Establecer un valor en el cache
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    // 5 minutos por defecto
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Invalidar una entrada específica del cache
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidar todas las entradas que coincidan con un patrón
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
      pattern.test(key)
    );

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia global del cache
export const cache = new MemoryCache();

// Limpiar entradas expiradas cada 10 minutos
setInterval(
  () => {
    cache.cleanup();
  },
  10 * 60 * 1000
);

/**
 * Utilidad para wrappear funciones con cache
 */
export function withCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  getKey: (...args: TArgs) => string,
  ttlMs: number = 5 * 60 * 1000
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = getKey(...args);

    // Intentar obtener del cache primero
    const cached = cache.get<TReturn>(key);
    if (cached !== null) {
      return cached;
    }

    // Si no está en cache, ejecutar la función
    const result = await fn(...args);

    // Guardar en cache
    cache.set(key, result, ttlMs);

    return result;
  };
}
