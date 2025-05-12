import { ChunkOptions } from '../models';
import { Logger } from '../../../utils/Logger';

/**
 * Utility for chunking large documents into manageable pieces
 */
export class DocumentChunker {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('DocumentChunker');
    }

    /**
     * Initialize the document chunker
     */
    async initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Split text into chunks with overlap
     * @param text Text to chunk
     * @param options Chunking options
     * @returns Array of text chunks
     */
    chunk(text: string, options: ChunkOptions): string[] {
        if (!text || text.length === 0) {
            return [];
        }

        const { maxChunkSize, overlap, preserveHeaders } = options;

        // If text is small enough, return as single chunk
        if (text.length <= maxChunkSize) {
            return [text];
        }

        try {
            // Prefer to split at paragraph boundaries
            if (preserveHeaders) {
                return this.chunkByParagraphs(text, maxChunkSize, overlap);
            } else {
                // Simple chunking by character count
                return this.chunkByCharacters(text, maxChunkSize, overlap);
            }
        } catch (error) {
            this.logger.error('Error chunking document, falling back to simple chunking', error);
            return this.chunkByCharacters(text, maxChunkSize, overlap);
        }
    }

    /**
     * Split text into chunks by paragraph boundaries
     * @param text Text to chunk
     * @param maxChunkSize Maximum size of each chunk
     * @param overlap Overlap between chunks
     * @returns Array of text chunks
     */
    private chunkByParagraphs(text: string, maxChunkSize: number, overlap: number): string[] {
        // Split into paragraphs
        const paragraphs = text.split(/\n\s*\n/);
        const chunks: string[] = [];
        let currentChunk: string[] = [];
        let currentLength = 0;

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            const paragraphLength = paragraph.length;

            // If adding this paragraph would exceed maxChunkSize, start a new chunk
            if (currentChunk.length > 0 && currentLength + paragraphLength + 2 > maxChunkSize) {
                // Add the current chunk to the result
                chunks.push(currentChunk.join('\n\n'));

                // Create overlapping chunk: include the last few paragraphs from the previous chunk
                currentChunk = this.createOverlappingParagraphs(currentChunk, overlap);
                currentLength = currentChunk.join('\n\n').length;
            }

            // Add paragraph to current chunk
            currentChunk.push(paragraph);
            currentLength += paragraphLength + 2; // +2 for '\n\n'
        }

        // Add the final chunk if not empty
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n\n'));
        }

        return chunks;
    }

    /**
     * Create overlapping paragraphs for the start of a new chunk
     * @param paragraphs Previous chunk's paragraphs
     * @param overlap Desired overlap size
     * @returns Array of paragraphs to start the new chunk with
     */
    private createOverlappingParagraphs(paragraphs: string[], overlap: number): string[] {
        // Determine how many paragraphs to include for overlap
        let overlapLength = 0;
        const overlapParagraphs: string[] = [];

        // Start from the end and work backwards
        for (let i = paragraphs.length - 1; i >= 0; i--) {
            const paragraph = paragraphs[i];
            if (overlapLength + paragraph.length > overlap) {
                // We've reached sufficient overlap
                break;
            }

            overlapParagraphs.unshift(paragraph);
            overlapLength += paragraph.length + 2; // +2 for '\n\n'
        }

        return overlapParagraphs;
    }

    /**
     * Simple chunking by character count
     * @param text Text to chunk
     * @param maxChunkSize Maximum size of each chunk
     * @param overlap Overlap between chunks
     * @returns Array of text chunks
     */
    private chunkByCharacters(text: string, maxChunkSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        let startPos = 0;

        while (startPos < text.length) {
            let endPos = Math.min(startPos + maxChunkSize, text.length);

            // Try to end at a sentence boundary if possible
            if (endPos < text.length) {
                // Look for a sentence boundary within the last 20% of the chunk
                const searchStart = Math.max(startPos + Math.floor(maxChunkSize * 0.8), startPos);
                const searchEnd = Math.min(searchStart + Math.floor(maxChunkSize * 0.2), text.length);
                const searchText = text.slice(searchStart, searchEnd);

                // Find the last sentence boundary in the search area
                const lastPeriod = searchText.lastIndexOf('.');
                const lastQuestion = searchText.lastIndexOf('?');
                const lastExclamation = searchText.lastIndexOf('!');

                const sentenceBoundary = Math.max(lastPeriod, lastQuestion, lastExclamation);

                if (sentenceBoundary !== -1) {
                    // Adjust endPos to end at the sentence boundary
                    endPos = searchStart + sentenceBoundary + 1;
                }
            }

            // Add the chunk
            chunks.push(text.slice(startPos, endPos));

            // Move start position for next chunk, accounting for overlap
            startPos = endPos - overlap;
        }

        return chunks;
    }

    /**
     * Estimate token count for text (approximate)
     * @param text Text to estimate tokens for
     * @returns Estimated token count
     */
    estimateTokens(text: string): number {
        // A very rough estimate: ~4 characters per token for English
        return Math.ceil(text.length / 4);
    }
}
