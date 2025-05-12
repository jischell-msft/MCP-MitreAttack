import { z } from 'zod';
import { TaskDefinition } from '../types';
import { EvalAgent } from '../../agents/EvalAgent';

/**
 * Task definition for evaluating documents against MITRE ATT&CK
 */
export const createEvalTask = (config: any): TaskDefinition => ({
    name: 'evaluate-document',
    handler: async (context, input) => {
        const { documentData, mitreData } = input;

        // Initialize EvalAgent
        const evalAgent = new EvalAgent({
            minConfidenceScore: config.minConfidenceScore || 65,
            maxMatches: config.maxMatches || 100,
            contextWindowSize: config.contextWindowSize || 200,
            useKeywordMatching: true,
            useTfIdfMatching: true,
            useFuzzyMatching: true,
            // Azure OpenAI config if available
            azureOpenAI: config.azureOpenAI ? {
                useAzureOpenAI: true,
                endpoint: config.azureOpenAI.endpoint,
                apiKey: config.azureOpenAI.apiKey,
                deploymentName: config.azureOpenAI.deploymentName,
                apiVersion: config.azureOpenAI.apiVersion,
                maxTokens: config.azureOpenAI.maxTokens,
                temperature: config.azureOpenAI.temperature,
                timeout: config.azureOpenAI.timeout,
                retryCount: config.azureOpenAI.retryCount
            } : { useAzureOpenAI: false }
        });

        await evalAgent.initialize(mitreData.techniques);

        // Process document in chunks if necessary
        if (documentData.documentChunks && documentData.documentChunks.length > 0) {
            const chunkResults = [];

            for (const chunk of documentData.documentChunks) {
                const result = await evalAgent.evaluateChunk(chunk);
                chunkResults.push(result);
            }

            // Merge results from all chunks
            return mergeEvalResults(chunkResults, documentData);
        } else {
            // Process entire document at once
            return await evalAgent.evaluate(documentData.documentContent);
        }
    },
    inputSchema: z.object({
        documentData: z.object({
            documentContent: z.string(),
            documentChunks: z.array(z.string()).optional(),
            sourceUrl: z.string().optional(),
            sourceFile: z.string().optional(),
            documentMetadata: z.record(z.string(), z.any()).optional()
        }),
        mitreData: z.object({
            techniques: z.array(z.any()),
            techniqueIndex: z.record(z.string(), z.any()),
            version: z.string()
        })
    }),
    outputSchema: z.object({
        matches: z.array(z.object({
            techniqueId: z.string(),
            techniqueName: z.string(),
            confidenceScore: z.number(),
            matchedText: z.string(),
            context: z.string(),
            textPosition: z.object({
                startChar: z.number(),
                endChar: z.number()
            }).optional(),
            matchSource: z.string()
        })),
        summary: z.object({
            documentId: z.string(),
            matchCount: z.number(),
            topTechniques: z.array(z.string()),
            tacticsCoverage: z.record(z.string(), z.number()),
            processingTimeMs: z.number(),
            azureOpenAIUsed: z.boolean()
        })
    }),
    timeout: 300000,  // 5 minutes
    retries: 1,
    retryDelay: 10000  // 10 seconds
});

/**
 * Helper function to merge evaluation results from multiple chunks
 */
function mergeEvalResults(chunkResults: any[], documentData: any): any {
    // Merge matches from all chunks, removing duplicates
    const techniqueMatches = new Map();

    for (const result of chunkResults) {
        for (const match of result.matches) {
            const key = match.techniqueId;

            if (!techniqueMatches.has(key) ||
                techniqueMatches.get(key).confidenceScore < match.confidenceScore) {
                techniqueMatches.set(key, match);
            }
        }
    }

    // Calculate combined tacticsCoverage
    const tacticsCoverage: Record<string, number> = {};

    for (const result of chunkResults) {
        for (const [tactic, count] of Object.entries(result.summary.tacticsCoverage)) {
            tacticsCoverage[tactic] = (tacticsCoverage[tactic] || 0) + (count as number);
        }
    }

    // Calculate total processing time
    const totalProcessingTime = chunkResults.reduce(
        (total, result) => total + result.summary.processingTimeMs,
        0
    );

    // Check if Azure OpenAI was used for any chunk
    const azureOpenAIUsed = chunkResults.some(result => result.summary.azureOpenAIUsed);

    // Sort matches by confidence score
    const sortedMatches = Array.from(techniqueMatches.values())
        .sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Calculate top techniques
    const topTechniques = sortedMatches
        .slice(0, 5)
        .map(match => match.techniqueId);

    return {
        matches: sortedMatches,
        summary: {
            documentId: chunkResults[0].summary.documentId,
            matchCount: sortedMatches.length,
            topTechniques,
            tacticsCoverage,
            processingTimeMs: totalProcessingTime,
            azureOpenAIUsed
        }
    };
}
