/**
 * FetchAgent interfaces and types
 */

/**
 * Configuration for FetchAgent
 */
export interface FetchAgentConfig {
    sourceUrl: string;
    backupSourceUrl?: string;
    cacheDir: string;
    updateInterval: number; // in milliseconds
    maxRetries: number;
    requestTimeout: number; // in milliseconds
}

/**
 * Output from fetch operation
 */
export interface FetchAgentOutput {
    mitreData: object;            // Raw MITRE ATT&CK data
    version: string;              // Version identifier 
    timestamp: Date;              // Fetch timestamp
    source: string;               // Source URL
    changeDetected: boolean;      // Whether this is a new version
}

/**
 * Metadata for cached MITRE data
 */
export interface MitreDataMetadata {
    version: string;
    timestamp: string;
    source: string;
    etag?: string;
    lastModified?: string;
}

/**
 * FetchAgent interface
 */
export interface IFetchAgent {
    initialize(): Promise<void>;
    fetch(forceUpdate?: boolean): Promise<FetchAgentOutput>;
    getLatestVersion(): Promise<string>;
    scheduleUpdates(): void;
    stopScheduledUpdates(): void;
}
