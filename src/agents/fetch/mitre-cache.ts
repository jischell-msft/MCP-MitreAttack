import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { MitreDataMetadata } from './types';

/**
 * Cache for MITRE ATT&CK data
 */
export class MitreCache {
    private cacheDir: string;

    /**
     * Create a new MitreCache
     * @param cacheDir Directory for storing cached data
     */
    constructor(cacheDir: string) {
        this.cacheDir = cacheDir;
    }

    /**
     * Initialize the cache directory structure
     */
    async initialize(): Promise<void> {
        try {
            // Create main cache directory if it doesn't exist
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
                logger.info(`Created cache directory: ${this.cacheDir}`);
            }

            // Create archive directory if it doesn't exist
            const archiveDir = path.join(this.cacheDir, 'archive');
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
                logger.info(`Created archive directory: ${archiveDir}`);
            }
        } catch (error: any) {
            logger.error(`Failed to initialize cache: ${error.message}`);
            throw new Error(`Failed to initialize cache: ${error.message}`);
        }
    }

    /**
     * Save data to cache
     * @param data MITRE ATT&CK data
     * @param metadata Metadata about the data
     */
    async saveData(data: object, metadata: MitreDataMetadata): Promise<void> {
        try {
            const latestPath = path.join(this.cacheDir, 'latest.json');
            const metadataPath = path.join(this.cacheDir, 'metadata.json');

            // Save data
            await fs.promises.writeFile(latestPath, JSON.stringify(data, null, 2));

            // Save metadata
            await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            // Archive the data with a timestamp-based filename
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const archivePath = path.join(this.cacheDir, 'archive', `${dateStr}.json`);

            // Only save to archive if the file doesn't exist
            if (!fs.existsSync(archivePath)) {
                await fs.promises.writeFile(archivePath, JSON.stringify(data, null, 2));
                logger.info(`Archived MITRE data to: ${archivePath}`);
            }

            logger.info(`Saved MITRE data v${metadata.version} to cache`);
        } catch (error: any) {
            logger.error(`Failed to save data to cache: ${error.message}`);
            throw new Error(`Failed to save data to cache: ${error.message}`);
        }
    }

    /**
     * Load latest data from cache
     * @returns Data and metadata, or null if not found
     */
    async loadLatestData(): Promise<{ data: object; metadata: MitreDataMetadata } | null> {
        try {
            const latestPath = path.join(this.cacheDir, 'latest.json');
            const metadataPath = path.join(this.cacheDir, 'metadata.json');

            // Check if files exist
            if (!fs.existsSync(latestPath) || !fs.existsSync(metadataPath)) {
                logger.debug('No cached MITRE data found');
                return null;
            }

            // Read data and metadata
            const dataJson = await fs.promises.readFile(latestPath, 'utf8');
            const metadataJson = await fs.promises.readFile(metadataPath, 'utf8');

            const data = JSON.parse(dataJson);
            const metadata = JSON.parse(metadataJson) as MitreDataMetadata;

            logger.info(`Loaded cached MITRE data v${metadata.version} from ${metadata.timestamp}`);
            return { data, metadata };
        } catch (error: any) {
            logger.warn(`Failed to load data from cache: ${error.message}`);
            return null;
        }
    }

    /**
     * Get metadata without loading full data
     * @returns Metadata or null if not found
     */
    async getMetadata(): Promise<MitreDataMetadata | null> {
        try {
            const metadataPath = path.join(this.cacheDir, 'metadata.json');

            // Check if file exists
            if (!fs.existsSync(metadataPath)) {
                return null;
            }

            // Read metadata
            const metadataJson = await fs.promises.readFile(metadataPath, 'utf8');
            return JSON.parse(metadataJson) as MitreDataMetadata;
        } catch (error: any) {
            logger.warn(`Failed to get metadata from cache: ${error.message}`);
            return null;
        }
    }

    /**
     * List archived versions
     * @returns List of archived versions with dates
     */
    async listArchivedVersions(): Promise<Array<{ date: string; path: string }>> {
        try {
            const archiveDir = path.join(this.cacheDir, 'archive');

            // Check if directory exists
            if (!fs.existsSync(archiveDir)) {
                return [];
            }

            // Get files in archive directory
            const files = await fs.promises.readdir(archiveDir);

            // Filter JSON files and parse dates
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    // Extract date from filename
                    const dateStr = path.basename(file, '.json');
                    return {
                        date: dateStr,
                        path: path.join(archiveDir, file)
                    };
                })
                .sort((a, b) => b.date.localeCompare(a.date)); // Sort newest first
        } catch (error: any) {
            logger.warn(`Failed to list archived versions: ${error.message}`);
            return [];
        }
    }

    /**
     * Validate the cache data integrity
     * @returns True if cache is valid
     */
    async validateCache(): Promise<boolean> {
        try {
            const latestPath = path.join(this.cacheDir, 'latest.json');
            const metadataPath = path.join(this.cacheDir, 'metadata.json');

            // Check if files exist
            if (!fs.existsSync(latestPath) || !fs.existsSync(metadataPath)) {
                return false;
            }

            // Check if files are valid JSON
            try {
                const dataJson = await fs.promises.readFile(latestPath, 'utf8');
                const metadataJson = await fs.promises.readFile(metadataPath, 'utf8');

                JSON.parse(dataJson);
                JSON.parse(metadataJson);

                return true;
            } catch (error) {
                logger.warn('Cache files exist but contain invalid JSON');
                return false;
            }
        } catch (error: any) {
            logger.warn(`Failed to validate cache: ${error.message}`);
            return false;
        }
    }

    /**
     * Clear the cache
     */
    async clearCache(): Promise<void> {
        try {
            const latestPath = path.join(this.cacheDir, 'latest.json');
            const metadataPath = path.join(this.cacheDir, 'metadata.json');

            // Delete latest data and metadata if they exist
            if (fs.existsSync(latestPath)) {
                await fs.promises.unlink(latestPath);
            }

            if (fs.existsSync(metadataPath)) {
                await fs.promises.unlink(metadataPath);
            }

            logger.info('Cleared MITRE cache');
        } catch (error: any) {
            logger.error(`Failed to clear cache: ${error.message}`);
            throw new Error(`Failed to clear cache: ${error.message}`);
        }
    }
}
