import { AzureOpenAIClient, AzureOpenAIConfig } from './azure-openai-client';
import { TokenUtils } from './token-utils';
import { TechniqueModel } from '../parse/types';
import { MITRE_ANALYSIS_PROMPT, generateMitreAnalysisPrompt } from './prompt-templates';
import { EvalMatch, EvalResult } from './types';
import { logger } from '../../utils/logger';

/**
 * Evaluate documents against MITRE techniques using Azure OpenAI
 */
export class AzureEval {
    private client: AzureOpenAIClient;
    private responseCache: Map<string, EvalResult> = new Map();

    /**
     * Create a new Azure OpenAI evaluator
     * @param config Azure OpenAI configuration
     */
    constructor(config: AzureOpenAIConfig) {
        this.client = new AzureOpenAIClient(config);
    }

    /**
     * Evaluate a document against MITRE techniques
     * @param document Document text to evaluate
     * @param techniques MITRE techniques to evaluate against
     * @returns Evaluation result with matches
     */
    async evaluate(document: string, techniques: TechniqueModel[]): Promise<EvalResult> {
        if (!document || !document.trim()) {
            return {
                matches: [],
                summary: {
                    documentId: '',
                    matchCount: 0,
                    topTechniques: [],
                    tacticsCoverage: {},
                    azureOpenAIUsed: true,
                    processingTimeMs: 0
                }
            };
        }

        try {
            logger.info('Evaluating document with Azure OpenAI', {
                documentLength: document.length,
                techniqueCount: techniques.length
            });

            const startTime = Date.now();

            if (TokenUtils.countTokens(document) > 6000) {
                // Document is too large, use progressive analysis
                const result = await this.analyzeProgressively(document, techniques);
                result.summary.processingTimeMs = Date.now() - startTime;
                return result;
            } else {
                // Document is small enough for single analysis
                const userPrompt = generateMitreAnalysisPrompt(document, TokenUtils.optimizeMitreTechniques(techniques));

                const response = await this.client.complete(MITRE_ANALYSIS_PROMPT, userPrompt);
                const matches = this.parseMatches(response);
                const result = {
                    matches,
                    summary: this.createSummary(matches, document, document)
                };

                result.summary.processingTimeMs = Date.now() - startTime;

                // Cache the result using a simple hash of document and techniques
                const cacheKey = this.generateCacheKey(document, techniques);
                this.responseCache.set(cacheKey, result);

                return result;
            }
        } catch (error: any) {
            logger.error('Azure OpenAI evaluation failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate a cache key for a document and techniques
     */
    private generateCacheKey(document: string, techniques: TechniqueModel[]): string {
        // Simple hash function - in production would use a proper hashing algorithm
        const docSample = document.substring(0, 100);
        const techIds = techniques.slice(0, 10).map(t => t.id).join(',');
        return `${docSample}:${techIds}`;
    }

    /**
     * Analyze a document progressively in chunks for large documents
     */
    private async analyzeProgressively(document: string, techniques: TechniqueModel[]): Promise<EvalResult> {
        // 1. Split document into chunks
        const chunks = TokenUtils.chunkDocument(document);
        logger.info(`Split document into ${chunks.length} chunks for progressive analysis`);

        // 2. Analyze each chunk
        const chunkResults: EvalMatch[][] = [];
        for (const [index, chunk] of chunks.entries()) {
            logger.info(`Analyzing chunk ${index + 1}/${chunks.length}`);

            try {
                const userPrompt = generateMitreAnalysisPrompt(chunk, TokenUtils.optimizeMitreTechniques(techniques));
                const response = await this.client.complete(MITRE_ANALYSIS_PROMPT, userPrompt);
                chunkResults.push(this.parseMatches(response));
            } catch (error) {
                logger.error(`Error analyzing chunk ${index + 1}`, { error });
                // Continue with other chunks even if one fails
            }
        }

        // 3. Merge results
        const allMatches = this.mergeMatches(chunkResults);

        // 4. Deduplicate and score
        const uniqueMatches = this.deduplicateMatches(allMatches);

        // 5. Create final result
        return {
            matches: uniqueMatches,
            summary: this.createSummary(uniqueMatches, document, chunks.join(' '))
        };
    }

    /**
     * Parse JSON response from Azure OpenAI into structured matches
     */
    private parseMatches(response: string): EvalMatch[] {
        try {
            // Try to parse the response as JSON
            const parsed = JSON.parse(response);

            if (!parsed.matches || !Array.isArray(parsed.matches)) {
                logger.warn('Invalid response format, missing matches array', { response });
                return [];
            }

            // Extract and validate each match
            return parsed.matches.map((match: any) => {
                return {
                    techniqueId: match.techniqueId || '',
                    techniqueName: match.techniqueName || '',
                    confidenceScore: typeof match.confidenceScore === 'number' ? match.confidenceScore : 0,
                    matchedText: match.matchedText || '',
                    context: match.rationale || '',
                    textPosition: {
                        startChar: 0,
                        endChar: 0
                    }
                };
            }).filter((match: EvalMatch) =>
                // Filter out invalid matches
                match.techniqueId &&
                match.techniqueName &&
                match.confidenceScore >= 60
            );
        } catch (error) {
            logger.error('Failed to parse Azure OpenAI response', { error, response });
            return [];
        }
    }

    /**
     * Merge matches from multiple document chunks
     */
    private mergeMatches(chunkResults: EvalMatch[][]): EvalMatch[] {
        const allMatches: EvalMatch[] = [];

        for (const matches of chunkResults) {
            allMatches.push(...matches);
        }

        return allMatches;
    }

    /**
     * Deduplicate matches by technique ID
     */
    private deduplicateMatches(matches: EvalMatch[]): EvalMatch[] {
        // Group by technique ID
        const groupedMatches = new Map<string, EvalMatch[]>();

        for (const match of matches) {
            if (!groupedMatches.has(match.techniqueId)) {
                groupedMatches.set(match.techniqueId, []);
            }
            groupedMatches.get(match.techniqueId)!.push(match);
        }

        // For each group, keep the highest confidence match or merge
        const uniqueMatches: EvalMatch[] = [];

        for (const [techniqueId, techniqueMatches] of groupedMatches.entries()) {
            if (techniqueMatches.length === 1) {
                uniqueMatches.push(techniqueMatches[0]);
            } else {
                // Find match with highest confidence
                const bestMatch = techniqueMatches.reduce((best, current) =>
                    current.confidenceScore > best.confidenceScore ? current : best
                    , techniqueMatches[0]);

                // Increase confidence if found in multiple chunks
                bestMatch.confidenceScore = Math.min(100, bestMatch.confidenceScore + 5 * (techniqueMatches.length - 1));
                uniqueMatches.push(bestMatch);
            }
        }

        // Sort by confidence (highest first)
        return uniqueMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);
    }

    /**
     * Create a summary from matches
     */
    private createSummary(matches: EvalMatch[], originalDoc: string, processedDoc: string): any {
        // Count matches by tactic
        const tacticsCoverage: Record<string, number> = {};
        const tactics = new Set<string>();

        // Get unique tactics from all matches
        matches.forEach(match => {
            // We don't have direct access to tactics here, but in a real implementation
            // you would look up the technique to find its associated tactics
            // For now, this is a placeholder
            tactics.add('unknown');
        });

        // Count matches per tactic
        tactics.forEach(tactic => {
            const matchesForTactic = matches.filter(match => true); // placeholder
            tacticsCoverage[tactic] = matchesForTactic.length;
        });

        // Get top techniques by confidence
        const topTechniques = matches
            .slice(0, 5)
            .map(match => match.techniqueId);

        return {
            documentId: '', // To be filled by caller
            matchCount: matches.length,
            topTechniques,
            tacticsCoverage,
            azureOpenAIUsed: true,
            processingTimeMs: 0 // Will be filled later
        };
    }
}
