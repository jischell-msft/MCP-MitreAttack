import { z } from 'zod';
import { TaskDefinition } from '../types';
import { DocIngestAgent } from '../../agents/DocIngestAgent';
import * as fs from 'fs';

/**
 * Task definition for ingesting documents (from URL or file)
 */
export const createIngestTask = (config: any): TaskDefinition => ({
    name: 'prepare-document',
    handler: async (context, input) => {
        const ingestAgent = new DocIngestAgent({
            tempDir: config.tempDir,
            maxChunkSize: config.maxChunkSize || 4000,
            overlapSize: config.overlapSize || 200,
            userAgent: config.userAgent || 'MCP-MITRE-Document-Analyzer',
            timeout: config.timeoutMs || 30000
        });

        await ingestAgent.initialize();

        if (input.url) {
            return await ingestAgent.processUrl(input.url);
        } else if (input.documentPath) {
            const buffer = fs.readFileSync(input.documentPath);
            const documentName = input.documentName || 'uploaded-document';
            return await ingestAgent.processDocument(buffer, documentName);
        } else {
            throw new Error('Invalid input: requires either url or documentPath');
        }
    },
    inputSchema: z.object({
        url: z.string().url().optional(),
        documentPath: z.string().optional(),
        documentName: z.string().optional()
    }).refine(data => data.url || data.documentPath, {
        message: 'Either url or documentPath must be provided'
    }),
    outputSchema: z.object({
        documentContent: z.string(),
        documentChunks: z.array(z.string()).optional(),
        sourceUrl: z.string().optional(),
        sourceFile: z.string().optional(),
        documentMetadata: z.record(z.string(), z.any()).optional(),
        contentType: z.string().optional(),
        pageCount: z.number().optional()
    }),
    timeout: 180000,  // 3 minutes
    retries: 2,
    retryDelay: 5000  // 5 seconds
});
