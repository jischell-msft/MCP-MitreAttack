import { Agent } from '../index';
import { IFetchAgent, FetchAgentConfig, FetchAgentOutput, MitreDataMetadata } from './types';
import { MitreApiClient } from './mitre-api-client';
import { MitreCache } from './mitre-cache';
import { logger } from '../../utils/logger';
import { extractVersionFromMitreData } from './version-utils';

/**
 * Agent responsible for fetching and caching MITRE ATT&CK data
 */
export class FetchAgent implements Agent, IFetchAgent {
    private config: FetchAgentConfig;
    private apiClient: MitreApiClient;
    private cache: MitreCache;
    private updateTimer: NodeJS.Timeout | null = null;
    private isInitialized = false;

    /**
     * Create a new FetchAgent
     * @param config Configuration options
     */
    constructor(config: FetchAgentConfig) {
        this.config = {
            // Set defaults for optional properties
            backupSourceUrl: undefined,
            ...config
        };

        this.apiClient = new MitreApiClient(config.requestTimeout, config.maxRetries);
        this.cache = new MitreCache(config.cacheDir);
    }

    /**
     * Initialize the agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        logger.info('Initializing FetchAgent');

        // Initialize cache
        await this.cache.initialize();

        this.isInitialized = true;
        logger.info('FetchAgent initialized successfully');
    }

    /**
     * Get the agent name
     */
    getName(): string {
        return 'FetchAgent';
    }

    /**
     * Get the agent version
     */
    getVersion(): string {
        return '1.0.0';
    }

    /**
     * Fetch MITRE ATT&CK data
     * @param forceUpdate Force update even if cached data is recent
     * @returns Fetched data and metadata
     */
    async fetch(forceUpdate = false): Promise<FetchAgentOutput> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        logger.info(`Fetching MITRE ATT&CK data${forceUpdate ? ' (forced update)' : ''}`);

        try {
            // Try to load cached data first (unless forced update)
            if (!forceUpdate) {
                const cachedData = await this.cache.loadLatestData();

                if (cachedData) {
                    // Return cached data
                    return {
                        mitreData: cachedData.data,
                        version: cachedData.metadata.version,
                        timestamp: new Date(cachedData.metadata.timestamp),
                        source: cachedData.metadata.source,
                        changeDetected: false // Using cached data, so no change
                    };
                }
            }

            // Get cached metadata for conditional request
            const metadata = await this.cache.getMetadata();

            // Perform request with conditional headers if available
            const response = await this.apiClient.fetchData(
                this.config.sourceUrl,
                metadata?.etag,
                metadata?.lastModified
            );

            // If not modified, return cached data
            if (!response.modified) {
                const cachedData = await this.cache.loadLatestData();

                if (!cachedData) {
                    // This shouldn't happen, but handle it just in case
                    throw new Error('Server returned 304 Not Modified but no cached data exists');
                }

                return {
                    mitreData: cachedData.data,
                    version: cachedData.metadata.version,
                    timestamp: new Date(cachedData.metadata.timestamp),
                    source: cachedData.metadata.source,
                    changeDetected: false
                };
            }

            // We have new data
            const mitreData = response.data;

            // Extract version from the data
            const version = extractVersionFromMitreData(mitreData);

            // Create new metadata
            const newMetadata: MitreDataMetadata = {
                version,
                timestamp: new Date().toISOString(),
                source: this.config.sourceUrl,
                etag: response.headers.etag,
                lastModified: response.headers['last-modified']
            };

            // Save to cache
            await this.cache.saveData(mitreData, newMetadata);

            // Determine if this is a new version
            const changeDetected = !metadata || metadata.version !== version;

            if (changeDetected) {
                logger.info(`New MITRE ATT&CK version detected: ${version}`);
            }

            return {
                mitreData,
                version,
                timestamp: new Date(newMetadata.timestamp),
                source: newMetadata.source,
                changeDetected
            };
        } catch (error: any) {
            logger.error(`Failed to fetch MITRE data: ${error.message}`);

            // Try backup source if available
            if (this.config.backupSourceUrl) {
                try {
                    logger.info(`Trying backup source: ${this.config.backupSourceUrl}`);
                    const response = await this.apiClient.fetchData(this.config.backupSourceUrl);

                    if (response.modified) {
                        const mitreData = response.data;
                        const version = extractVersionFromMitreData(mitreData);

                        const newMetadata: MitreDataMetadata = {
                            version,
                            timestamp: new Date().toISOString(),
                            source: this.config.backupSourceUrl,
                            etag: response.headers.etag,
                            lastModified: response.headers['last-modified']
                        };

                        await this.cache.saveData(mitreData, newMetadata);

                        return {
                            mitreData,
                            version,
                            timestamp: new Date(newMetadata.timestamp),
                            source: newMetadata.source,
                            changeDetected: true // Assume change when using backup
                        };
                    }
                } catch (backupError: any) {
                    logger.error(`Backup source also failed: ${backupError.message}`);
                }
            }

            // If we have cached data, return that as a fallback
            const cachedData = await this.cache.loadLatestData();
            if (cachedData) {
                logger.warn('Falling back to cached data due to fetch failure');
                return {
                    mitreData: cachedData.data,
                    version: cachedData.metadata.version,
                    timestamp: new Date(cachedData.metadata.timestamp),
                    source: cachedData.metadata.source,
                    changeDetected: false
                };
            }

            // No fallback available
            throw new Error(`Failed to fetch MITRE data: ${error.message}`);
        }
    }

    /**
     * Get the latest version of MITRE ATT&CK data
     * @returns Version string
     */
    async getLatestVersion(): Promise<string> {
        const metadata = await this.cache.getMetadata();

        if (metadata) {
            return metadata.version;
        }

        // No cached data, so fetch it
        const result = await this.fetch();
        return result.version;
    }

    /**
     * Start scheduled updates
     */
    scheduleUpdates(): void {
        if (this.updateTimer) {
            logger.warn('Updates are already scheduled');
            return;
        }

        logger.info(`Scheduling MITRE data updates every ${this.config.updateInterval / 60000} minutes`);

        this.updateTimer = setInterval(async () => {
            try {
                logger.info('Running scheduled update for MITRE data');
                await this.fetch();
            } catch (error: any) {
                logger.error(`Scheduled update failed: ${error.message}`);
            }
        }, this.config.updateInterval);
    }

    /**
     * Stop scheduled updates
     */
    stopScheduledUpdates(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            logger.info('Stopped scheduled MITRE data updates');
        }
    }
}
