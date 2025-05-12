import { logger } from '../../utils/logger';

/**
 * Metrics for tracking FetchAgent performance
 */
export class FetchMetrics {
    private fetchCount = 0;
    private successCount = 0;
    private failureCount = 0;
    private cacheHitCount = 0;
    private cacheMissCount = 0;
    private totalFetchTime = 0;
    private lastFetchTime = 0;
    private averageFetchTime = 0;
    private statusCodes: Record<number, number> = {};

    /**
     * Record a successful fetch operation
     * @param fetchTimeMs Time taken for the fetch in milliseconds
     * @param statusCode HTTP status code
     * @param fromCache Whether the data came from cache
     */
    recordSuccess(fetchTimeMs: number, statusCode: number = 200, fromCache = false): void {
        this.fetchCount++;
        this.successCount++;
        this.totalFetchTime += fetchTimeMs;
        this.lastFetchTime = fetchTimeMs;
        this.averageFetchTime = this.totalFetchTime / this.successCount;

        // Increment status code count
        this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;

        // Track cache hits/misses
        if (fromCache) {
            this.cacheHitCount++;
        } else {
            this.cacheMissCount++;
        }

        logger.debug(`Fetch success: ${fetchTimeMs}ms, status: ${statusCode}, fromCache: ${fromCache}`);
    }

    /**
     * Record a failed fetch operation
     * @param statusCode HTTP status code if available
     * @param error Error object or message
     */
    recordFailure(statusCode?: number, error?: Error | string): void {
        this.fetchCount++;
        this.failureCount++;

        // Increment status code count if available
        if (statusCode) {
            this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;
        }

        const errorMessage = error instanceof Error ? error.message : error;
        logger.debug(`Fetch failure: ${statusCode || 'unknown'}, error: ${errorMessage || 'unknown'}`);
    }

    /**
     * Get the current metrics
     * @returns Object with all metrics
     */
    getMetrics(): Record<string, any> {
        // Calculate cache hit rate
        const cacheHitRate = this.fetchCount > 0
            ? (this.cacheHitCount / this.fetchCount) * 100
            : 0;

        // Calculate success rate
        const successRate = this.fetchCount > 0
            ? (this.successCount / this.fetchCount) * 100
            : 0;

        return {
            fetchCount: this.fetchCount,
            successCount: this.successCount,
            failureCount: this.failureCount,
            successRate: successRate.toFixed(2) + '%',
            averageFetchTime: this.averageFetchTime.toFixed(2) + 'ms',
            lastFetchTime: this.lastFetchTime + 'ms',
            cacheHitCount: this.cacheHitCount,
            cacheMissCount: this.cacheMissCount,
            cacheHitRate: cacheHitRate.toFixed(2) + '%',
            statusCodes: this.statusCodes
        };
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.fetchCount = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
        this.totalFetchTime = 0;
        this.lastFetchTime = 0;
        this.averageFetchTime = 0;
        this.statusCodes = {};

        logger.debug('Fetch metrics reset');
    }
}

// Export singleton instance
export const fetchMetrics = new FetchMetrics();
