import { z } from 'zod';
import { TaskDefinition } from '../types';
import { ParseAgent } from '../../agents/ParseAgent';

/**
 * Task definition for parsing MITRE ATT&CK data
 */
export const createParseTask = (): TaskDefinition => ({
    name: 'parse-mitre-data',
    handler: async (context, input) => {
        const parseAgent = new ParseAgent({
            includeSubtechniques: true,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true
        });

        await parseAgent.initialize();
        return await parseAgent.parse(input.mitreData);
    },
    inputSchema: z.object({
        mitreData: z.any(),
        version: z.string(),
        timestamp: z.date(),
        source: z.string(),
        changeDetected: z.boolean()
    }),
    outputSchema: z.object({
        techniques: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            // Other fields optional for schema flexibility
        }).passthrough()),
        techniqueIndex: z.record(z.string(), z.any()),
        tacticMap: z.record(z.string(), z.array(z.string())),
        version: z.string()
    }),
    timeout: 30000,  // 30 seconds
    retries: 2,
    retryDelay: 2000  // 2 seconds
});
