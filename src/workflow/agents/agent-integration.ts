import { FetchAgent } from '../../agents/fetch/fetch-agent';
import { ParseAgent } from '../../agents/parse/parse-agent';
import { DocIngestAgent } from '../../agents/ingest/doc-ingest-agent';
import { EvalAgent } from '../../agents/eval/eval-agent';
import { ReportAgent } from '../../agents/report/report-agent';
import { WorkflowContext } from '../types';
import { ApplicationError, PermanentError } from '../../utils/errors';
import { Logger } from '../../utils/logger';
import { config } from '../../config';
import fs from 'fs';

const logger = new Logger('AgentIntegration');

/**
 * Handles URL input processing for the workflow
 */
export async function handleUrlInput(url: string, context: WorkflowContext): Promise<any> {
    // Initialize DocIngestAgent
    const ingestAgent = new DocIngestAgent({
        maxDocumentSize: 50 * 1024 * 1024, // 50MB
        maxChunkSize: 10000,
        chunkOverlap: 1000,
        userAgent: 'MCP/1.0',
        timeout: 30000,
        retries: 3,
        followRedirects: true
    });

    await ingestAgent.initialize();

    try {
        // Process URL
        const result = await ingestAgent.processUrl(url);

        // Add workflow metadata
        context.metadata.sourceUrl = url;
        context.metadata.documentFormat = result.format;

        return {
            documentContent: result.extractedText,
            documentChunks: result.textChunks,
            documentMetadata: result.metadata,
            sourceUrl: result.sourceUrl,
            sourceFile: null
        };
    } catch (error) {
        logger.error(`Error processing URL: ${url}`, {
            workflowId: context.workflowId,
            error: error.message,
            url
        });

        throw new ApplicationError('URL_PROCESSING_FAILED', `Failed to process URL: ${error.message}`, error);
    }
}

/**
 * Handles document input processing for the workflow
 */
export async function handleDocumentInput(
    filePath: string,
    fileName: string,
    context: WorkflowContext
): Promise<any> {
    // Initialize DocIngestAgent
    const ingestAgent = new DocIngestAgent({
        maxDocumentSize: 50 * 1024 * 1024, // 50MB
        maxChunkSize: 10000,
        chunkOverlap: 1000,
        userAgent: 'MCP/1.0',
        timeout: 30000,
        retries: 3,
        followRedirects: true
    });

    await ingestAgent.initialize();

    try {
        // Process document file
        const result = await ingestAgent.processFile(filePath, fileName);

        // Add workflow metadata
        context.metadata.documentName = fileName;
        context.metadata.documentFormat = result.format;

        return {
            documentContent: result.extractedText,
            documentChunks: result.textChunks,
            documentMetadata: result.metadata,
            sourceUrl: null,
            sourceFile: fileName
        };
    } catch (error) {
        logger.error(`Error processing document: ${fileName}`, {
            workflowId: context.workflowId,
            error: error.message,
            fileName
        });

        throw new ApplicationError('DOCUMENT_PROCESSING_FAILED', `Failed to process document: ${error.message}`, error);
    }
}

/**
 * Merges results from chunked document evaluation
 */
export function mergeEvalResults(chunkResults: any[], documentData: any): any {
    // Combine matches from all chunks
    const allMatches = chunkResults.flatMap(result => result.matches);

    // Deduplicate matches by techniqueId and taking highest confidence score
    const techniqueMap = new Map();
    for (const match of allMatches) {
        const existing = techniqueMap.get(match.techniqueId);
        if (!existing || match.confidenceScore > existing.confidenceScore) {
            techniqueMap.set(match.techniqueId, match);
        }
    }

    // Calculate combined summary
    const matches = Array.from(techniqueMap.values());

    // Get summary data from the first chunk and update counts
    const summary = {
        ...chunkResults[0].summary,
        matchCount: matches.length,
        topTechniques: matches
            .sort((a, b) => b.confidenceScore - a.confidenceScore)
            .slice(0, 5)
            .map(m => m.techniqueId),
        tacticsCoverage: calculateTacticsCoverage(matches),
        processingTimeMs: chunkResults.reduce((total, r) => total + r.summary.processingTimeMs, 0)
    };

    return {
        matches,
        summary
    };
}

/**
 * Calculate tactics coverage from matches
 */
function calculateTacticsCoverage(matches: any[]): Record<string, number> {
    const coverage: Record<string, number> = {};

    for (const match of matches) {
        // This assumes techniques have tactics available
        // In a real implementation, you would look up the technique's tactics
        // For now using placeholder logic
        const tactics = ['execution', 'persistence', 'privilege-escalation']; // Would come from technique data

        for (const tactic of tactics) {
            coverage[tactic] = (coverage[tactic] || 0) + 1;
        }
    }

    return coverage;
}
