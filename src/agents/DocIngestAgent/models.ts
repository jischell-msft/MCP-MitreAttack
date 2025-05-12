/**
 * DocIngestAgent models and interfaces
 */

export interface DocIngestAgentConfig {
    maxDocumentSize: number;      // Maximum document size in bytes
    maxChunkSize: number;         // Maximum chunk size in characters
    chunkOverlap: number;         // Overlap between chunks in characters
    userAgent: string;            // User agent for HTTP requests
    timeout: number;              // Timeout for HTTP requests in ms
    retries: number;              // Number of retries for failed requests
    followRedirects: boolean;     // Whether to follow redirects
}

export interface DocumentMetadata {
    title?: string;
    author?: string;
    createdDate?: Date;
    pageCount?: number;
    charCount: number;
    mimeType?: string;
    language?: string;
}

export interface DocIngestResult {
    sourceUrl?: string;           // Original URL if applicable
    sourceFile?: string;          // Original filename if applicable
    extractedText: string;        // Full extracted text
    textChunks?: string[];        // Text broken into processable chunks
    metadata: DocumentMetadata;   // Document metadata
    format: string;               // Detected format
    extractionTimestamp: Date;    // When processing completed
}

export interface TooLargeDocumentError extends Error {
    size: number;
    limit: number;
}

export type SupportedFileFormat = 'html' | 'pdf' | 'docx' | 'txt' | 'md' | 'rtf';

export interface FormatDetectionResult {
    format: SupportedFileFormat;
    mimeType: string;
}

export interface ChunkOptions {
    maxChunkSize: number;
    overlap: number;
    preserveHeaders?: boolean;
    includeMetadata?: boolean;
}

export interface IDocIngestAgent {
    initialize(): Promise<void>;
    processUrl(url: string, options?: Partial<ChunkOptions>): Promise<DocIngestResult>;
    processFile(filePath: string, fileName: string, options?: Partial<ChunkOptions>): Promise<DocIngestResult>;
    extractText(content: Buffer, format: SupportedFileFormat): Promise<string>;
    normalizeText(text: string): string;
    chunkText(text: string, options?: Partial<ChunkOptions>): string[];
}
