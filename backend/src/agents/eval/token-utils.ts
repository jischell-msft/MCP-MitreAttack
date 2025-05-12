import { encode } from 'gpt-3-encoder';
import { TechniqueModel } from '../parse/types';

/**
 * Utility functions for token management
 */
export class TokenUtils {
    /**
     * Count tokens in a text string using GPT-3 tokenizer
     * @param text Text to count tokens in
     * @returns Number of tokens
     */
    static countTokens(text: string): number {
        return encode(text).length;
    }

    /**
     * Truncate a string to fit within a certain token limit
     * @param text Text to truncate
     * @param maxTokens Maximum tokens allowed
     * @returns Truncated string
     */
    static truncateToFitTokens(text: string, maxTokens: number): string {
        if (!text) return '';

        const tokens = encode(text);

        if (tokens.length <= maxTokens) {
            return text;
        }

        // Truncate tokens and decode back to string
        const truncatedTokens = tokens.slice(0, maxTokens);
        return new TextDecoder().decode(
            new Uint8Array(truncatedTokens)
        );
    }

    /**
     * Optimize MITRE techniques to reduce token usage
     * @param techniques Full technique models
     * @returns Simplified techniques with reduced token count
     */
    static optimizeMitreTechniques(techniques: TechniqueModel[]): any[] {
        // Extract only necessary fields to reduce token usage
        return techniques.map(technique => ({
            id: technique.id,
            name: technique.name,
            description: TokenUtils.truncateDescription(technique.description, 100),
            tactics: technique.tactics,
            keywords: technique.keywords
        }));
    }

    /**
     * Truncate a description to roughly fit within a certain word count
     * @param description Full description
     * @param maxWords Maximum words to include
     * @returns Truncated description
     */
    static truncateDescription(description: string, maxWords: number): string {
        if (!description) return '';

        const words = description.split(/\s+/);

        if (words.length <= maxWords) {
            return description;
        }

        return words.slice(0, maxWords).join(' ') + '...';
    }

    /**
     * Split a document into chunks with some overlap
     * @param document Full document text
     * @param maxTokensPerChunk Maximum tokens per chunk
     * @param overlapTokens Token overlap between chunks
     * @returns Array of document chunks
     */
    static chunkDocument(document: string, maxTokensPerChunk = 3000, overlapTokens = 200): string[] {
        if (!document) return [];

        const tokens = encode(document);
        const chunks: string[] = [];

        if (tokens.length <= maxTokensPerChunk) {
            return [document];
        }

        let position = 0;
        while (position < tokens.length) {
            const chunkTokens = tokens.slice(position, position + maxTokensPerChunk);
            const chunkText = new TextDecoder().decode(new Uint8Array(chunkTokens));
            chunks.push(chunkText);

            // Move position forward, accounting for overlap
            position += maxTokensPerChunk - overlapTokens;
        }

        return chunks;
    }

    /**
     * Prepare an optimized API payload that fits within token limits
     * @param document Document text
     * @param techniques MITRE techniques
     * @param maxInputTokens Maximum input tokens allowed
     * @returns Messages array for API request
     */
    static prepareApiPayload(
        systemPrompt: string,
        document: string,
        techniques: TechniqueModel[],
        maxInputTokens = 7000
    ): any {
        // Create optimized techniques
        const optimizedTechniques = TokenUtils.optimizeMitreTechniques(techniques);

        // Create user prompt
        const userPrompt = `DOCUMENT: ${document}\n\nMITRE TECHNIQUES: ${JSON.stringify(optimizedTechniques)}\n\nAnalyze the document against these techniques and identify matches.`;

        // Count tokens
        const systemTokens = TokenUtils.countTokens(systemPrompt);
        const userTokens = TokenUtils.countTokens(userPrompt);
        const totalInputTokens = systemTokens + userTokens;

        if (totalInputTokens <= maxInputTokens) {
            return {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            };
        } else {
            // Need to reduce tokens
            return TokenUtils.createReducedPayload(systemPrompt, document, techniques, maxInputTokens);
        }
    }

    /**
     * Create a reduced payload when the original is too large
     * @param systemPrompt System prompt
     * @param document Document text
     * @param techniques MITRE techniques
     * @param maxInputTokens Maximum input tokens allowed
     * @returns Reduced messages for API request
     */
    static createReducedPayload(
        systemPrompt: string,
        document: string,
        techniques: TechniqueModel[],
        maxInputTokens: number
    ): any {
        const systemTokens = TokenUtils.countTokens(systemPrompt);

        // Allocate tokens: system prompt + techniques + document
        // Reserve 20% for techniques, the rest for document
        const maxTechniqueTokens = Math.floor((maxInputTokens - systemTokens) * 0.2);
        const maxDocumentTokens = maxInputTokens - systemTokens - maxTechniqueTokens;

        // Reduce techniques to fit
        let reducedTechniques = TokenUtils.optimizeMitreTechniques(techniques);
        let techniquesJson = JSON.stringify(reducedTechniques);
        let techniqueTokens = TokenUtils.countTokens(techniquesJson);

        // If still too large, reduce further
        if (techniqueTokens > maxTechniqueTokens) {
            // Try reducing number of techniques
            const targetCount = Math.floor(reducedTechniques.length * (maxTechniqueTokens / techniqueTokens));
            reducedTechniques = reducedTechniques.slice(0, targetCount);
            techniquesJson = JSON.stringify(reducedTechniques);
            techniqueTokens = TokenUtils.countTokens(techniquesJson);

            // If still too large, remove descriptions
            if (techniqueTokens > maxTechniqueTokens) {
                reducedTechniques = reducedTechniques.map(t => ({
                    id: t.id,
                    name: t.name,
                    tactics: t.tactics
                }));
                techniquesJson = JSON.stringify(reducedTechniques);
            }
        }

        // Truncate document to fit
        const truncatedDocument = TokenUtils.truncateToFitTokens(document, maxDocumentTokens);

        // Build user message
        const userPrompt = `DOCUMENT: ${truncatedDocument}\n\nMITRE TECHNIQUES: ${techniquesJson}\n\nAnalyze the document against these techniques and identify matches.`;

        return {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        };
    }
}
