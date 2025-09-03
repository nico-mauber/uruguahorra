import { logger, LogModule } from '@/utils/logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface CacheStats {
  size: number;
  entries: string[];
  hitRate: number;
  totalRequests: number;
  totalHits: number;
}

/**
 * Generic cache service with intelligent expiration and memory management
 */
export class CacheService<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtl: number;
  private hitCount = 0;
  private totalRequests = 0;

  constructor(maxSize: number = 100, defaultTtl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get item from cache with automatic expiry check
   */
  get(key: string): T | null {
    this.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    this.hitCount++;
    return entry.data;
  }

  /**
   * Set item in cache with optional custom TTL
   */
  set(key: string, data: T, ttl?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const expiry = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { data, timestamp: Date.now(), expiry });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
    logger.info(LogModule.DB, 'Cache cleared');
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error in getOrSet', { key, error });
      throw error;
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(LogModule.DB, 'Evicted oldest cache entry', {
        key: oldestKey,
      });
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(LogModule.DB, 'Cache cleanup completed', {
        removedEntries: removed,
      });
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate =
      this.totalRequests > 0 ? (this.hitCount / this.totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.totalRequests,
      totalHits: this.hitCount,
    };
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.hitCount = 0;
    this.totalRequests = 0;
  }

  /**
   * Get cache memory usage (approximate)
   */
  getMemoryUsage(): { entryCount: number; approxSizeKB: number } {
    const entryCount = this.cache.size;
    // Rough estimate: each entry ~1KB (varies by data type)
    const approxSizeKB = entryCount * 1;

    return { entryCount, approxSizeKB };
  }

  /**
   * Set new TTL for existing entry
   */
  refreshTtl(key: string, ttl?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiry = Date.now() + (ttl || this.defaultTtl);
    return true;
  }

  /**
   * Get entries by pattern (simple string matching)
   */
  getKeysByPattern(pattern: string): string[] {
    return Array.from(this.cache.keys()).filter((key) => key.includes(pattern));
  }

  /**
   * Delete entries by pattern
   */
  deleteByPattern(pattern: string): number {
    const matchingKeys = this.getKeysByPattern(pattern);
    let deleted = 0;

    for (const key of matchingKeys) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }
}

/**
 * Memoization decorator for class methods
 */
export function memoize<T extends (...args: any[]) => any>(
  ttl: number = 5 * 60 * 1000,
  maxSize: number = 50
) {
  const cache = new CacheService<ReturnType<T>>(maxSize, ttl);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      ...args: Parameters<T>
    ): Promise<ReturnType<T>> {
      const key = `${propertyKey}_${JSON.stringify(args)}`;

      return await cache.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}

/**
 * Simple function memoization
 */
export function memoizeFunction<T extends (...args: any[]) => any>(
  fn: T,
  ttl: number = 5 * 60 * 1000,
  maxSize: number = 50
): T {
  const cache = new CacheService<ReturnType<T>>(maxSize, ttl);

  return ((...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = JSON.stringify(args);

    if (typeof fn(...args).then === 'function') {
      // Async function
      return cache.getOrSet(key, () => fn(...args), ttl);
    } else {
      // Sync function - wrap in promise
      return cache.getOrSet(key, () => Promise.resolve(fn(...args)), ttl);
    }
  }) as T;
}
