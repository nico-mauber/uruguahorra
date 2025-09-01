import { logger, LogModule } from '@/utils/logger';

/**
 * Service for managing cross-store cache invalidation
 * Ensures that when transactions change, analytics are immediately invalidated
 */
class CacheManagerService {
  private static instance: CacheManagerService;
  private subscribers: Array<() => void> = [];

  static getInstance(): CacheManagerService {
    if (!CacheManagerService.instance) {
      CacheManagerService.instance = new CacheManagerService();
    }
    return CacheManagerService.instance;
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    logger.info(LogModule.DB, 'Cache invalidation subscriber added');

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
      logger.info(LogModule.DB, 'Cache invalidation subscriber removed');
    };
  }

  /**
   * Invalidate all analytics caches across the app
   * This is called when transactions are modified
   */
  invalidateAnalyticsCache(): void {
    logger.info(
      LogModule.DB,
      'Invalidating analytics cache across all stores',
      {
        subscriberCount: this.subscribers.length,
      }
    );

    this.subscribers.forEach((callback, index) => {
      try {
        callback();
        logger.debug(
          LogModule.DB,
          `Cache invalidation callback ${index + 1} executed`
        );
      } catch (error) {
        logger.error(
          LogModule.DB,
          `Cache invalidation callback ${index + 1} failed`,
          error
        );
      }
    });
  }

  /**
   * Force refresh of analytics data
   * More aggressive than invalidation - forces immediate data refetch
   */
  forceRefreshAnalytics(): void {
    logger.info(LogModule.DB, 'Forcing analytics refresh across all stores');
    this.invalidateAnalyticsCache();
  }
}

export const cacheManager = CacheManagerService.getInstance();
export { CacheManagerService };
