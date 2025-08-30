/**
 * 🚀 PREFERENCES CACHE SYSTEM
 * Intelligent caching system for analytics preferences
 * Reduces database calls and improves performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalyticsPreferences } from '@/services/analytics-preferences.service';

interface CacheEntry {
  data: AnalyticsPreferences;
  timestamp: number;
  version: string;
}

interface CacheMetadata {
  lastSync: number;
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
}

class PreferencesCache {
  private static instance: PreferencesCache;
  private readonly CACHE_VERSION = '1.0';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_KEY_PREFIX = 'analytics_prefs_';
  private readonly METADATA_KEY = 'analytics_cache_metadata';

  static getInstance(): PreferencesCache {
    if (!PreferencesCache.instance) {
      PreferencesCache.instance = new PreferencesCache();
    }
    return PreferencesCache.instance;
  }

  /**
   * Get cache key for user
   */
  private getCacheKey(userId: string): string {
    return `${this.CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValidCacheEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    const isExpired = now - entry.timestamp > this.CACHE_DURATION;
    const isVersionMismatch = entry.version !== this.CACHE_VERSION;

    return !isExpired && !isVersionMismatch;
  }

  /**
   * Get cached preferences for user
   */
  async get(userId: string): Promise<AnalyticsPreferences | null> {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        await this.updateMetadata({ cacheMisses: 1 });
        return null;
      }

      const entry: CacheEntry = JSON.parse(cachedData);

      if (!this.isValidCacheEntry(entry)) {
        // Remove expired cache
        await AsyncStorage.removeItem(cacheKey);
        await this.updateMetadata({ cacheMisses: 1 });
        return null;
      }

      await this.updateMetadata({ cacheHits: 1 });
      return entry.data;
    } catch (error) {
      console.warn('PreferencesCache.get error:', error);
      await this.updateMetadata({ cacheMisses: 1 });
      return null;
    }
  }

  /**
   * Set cached preferences for user
   */
  async set(userId: string, preferences: AnalyticsPreferences): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId);
      const entry: CacheEntry = {
        data: preferences,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      await this.updateMetadata({ lastSync: Date.now() });
    } catch (error) {
      console.warn('PreferencesCache.set error:', error);
    }
  }

  /**
   * Invalidate cache for user
   */
  async invalidate(userId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('PreferencesCache.invalidate error:', error);
    }
  }

  /**
   * Clear all cached preferences
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) =>
        key.startsWith(this.CACHE_KEY_PREFIX)
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      await AsyncStorage.removeItem(this.METADATA_KEY);
    } catch (error) {
      console.warn('PreferencesCache.clearAll error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheMetadata & { hitRatio: number }> {
    try {
      const metadataRaw = await AsyncStorage.getItem(this.METADATA_KEY);
      const metadata: CacheMetadata = metadataRaw
        ? JSON.parse(metadataRaw)
        : { lastSync: 0, cacheHits: 0, cacheMisses: 0, totalRequests: 0 };

      const hitRatio =
        metadata.totalRequests > 0
          ? metadata.cacheHits / metadata.totalRequests
          : 0;

      return { ...metadata, hitRatio };
    } catch (error) {
      console.warn('PreferencesCache.getStats error:', error);
      return {
        lastSync: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalRequests: 0,
        hitRatio: 0,
      };
    }
  }

  /**
   * Update cache metadata
   */
  private async updateMetadata(updates: Partial<CacheMetadata>): Promise<void> {
    try {
      const current = await this.getStats();
      const newMetadata: CacheMetadata = {
        lastSync: updates.lastSync || current.lastSync,
        cacheHits: current.cacheHits + (updates.cacheHits || 0),
        cacheMisses: current.cacheMisses + (updates.cacheMisses || 0),
        totalRequests:
          current.totalRequests +
          (updates.cacheHits || 0) +
          (updates.cacheMisses || 0),
      };

      await AsyncStorage.setItem(
        this.METADATA_KEY,
        JSON.stringify(newMetadata)
      );
    } catch (error) {
      console.warn('PreferencesCache.updateMetadata error:', error);
    }
  }

  /**
   * Preload preferences for multiple users
   */
  async preloadUsers(
    userIds: string[],
    getPreferences: (userId: string) => Promise<AnalyticsPreferences>
  ): Promise<void> {
    const promises = userIds.map(async (userId) => {
      const cached = await this.get(userId);
      if (!cached) {
        try {
          const preferences = await getPreferences(userId);
          await this.set(userId, preferences);
        } catch (error) {
          console.warn(
            `Failed to preload preferences for user ${userId}:`,
            error
          );
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) =>
        key.startsWith(this.CACHE_KEY_PREFIX)
      );
      let cleanedCount = 0;

      for (const key of cacheKeys) {
        const cachedData = await AsyncStorage.getItem(key);
        if (cachedData) {
          try {
            const entry: CacheEntry = JSON.parse(cachedData);
            if (!this.isValidCacheEntry(entry)) {
              await AsyncStorage.removeItem(key);
              cleanedCount++;
            }
          } catch (error) {
            // Invalid JSON, remove it
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.warn('PreferencesCache.cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get cache size information
   */
  async getCacheSize(): Promise<{
    entryCount: number;
    estimatedSizeKB: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) =>
        key.startsWith(this.CACHE_KEY_PREFIX)
      );

      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }

      return {
        entryCount: cacheKeys.length,
        estimatedSizeKB: Math.round(totalSize / 1024),
      };
    } catch (error) {
      console.warn('PreferencesCache.getCacheSize error:', error);
      return { entryCount: 0, estimatedSizeKB: 0 };
    }
  }
}

// Export singleton instance
export const preferencesCache = PreferencesCache.getInstance();

// Export types
export type { CacheMetadata };

/**
 * Higher-order function to add caching to any preferences function
 */
export const withCache = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getCacheKey: (...args: T) => string,
  userId: string
) => {
  return async (...args: T): Promise<R> => {
    const cacheKey = getCacheKey(...args);

    // Try to get from cache first
    const cached = await preferencesCache.get(`${userId}_${cacheKey}`);
    if (cached) {
      return cached as R;
    }

    // Execute original function
    const result = await fn(...args);

    // Cache the result
    if (result && typeof result === 'object') {
      await preferencesCache.set(
        `${userId}_${cacheKey}`,
        result as AnalyticsPreferences
      );
    }

    return result;
  };
};

/**
 * Cache warming utility
 */
export const warmCache = async (
  userId: string,
  getPreferences: () => Promise<AnalyticsPreferences>
): Promise<void> => {
  try {
    const preferences = await getPreferences();
    await preferencesCache.set(userId, preferences);
  } catch (error) {
    console.warn('Failed to warm cache:', error);
  }
};
