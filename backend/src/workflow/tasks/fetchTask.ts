import { z } from 'zod';
import { TaskDefinition } from '../types';
import { FetchAgent } from '../../agents/FetchAgent';

/**
 * Task definition for fetching MITRE ATT&CK data
 */
export const createFetchTask = (config: any): TaskDefinition => ({
    name: 'fetch-mitre-data',
    handler: async (context, input) => {
        const fetchAgent = new FetchAgent({
            sourceUrl: config.mitreAttackUrl,
            cacheDir: config.mitreCacheDir,
            updateInterval: config.mitreUpdateInterval,
            maxRetries: 3,
            requestTimeout: 30000
        });

        await fetchAgent.initialize();
        return await fetchAgent.fetch();
    },
    inputSchema: z.object({}),  // No input needed
    outputSchema: z.object({
        mitreData: z.any(),
        version: z.string(),
        timestamp: z.date(),
        source: z.string(),
        changeDetected: z.boolean()
    }),
    timeout: 60000,  // 1 minute
    retries: 3,
    retryDelay: 5000  // 5 seconds
});
