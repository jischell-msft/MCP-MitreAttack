import {
    DocIngestAgentConfig,
    DocIngestResult,
    SupportedFileFormat,
    ChunkOptions,
    IDocIngestAgent,
    FormatDetectionResult
} from './models';
import { UrlValidator } from './utils/UrlValidator';
import { UrlFetcher } from './utils/UrlFetcher';
import { FileFormatDetector } from './utils/FileFormatDetector';
import { TextNormalizer } from './utils/TextNormalizer';
import { DocumentChunker } from './utils/DocumentChunker';
import { HtmlExtractor } from './extractors/HtmlExtractor';
import { PdfExtractor } from './extractors/PdfExtractor';
import { DocxExtractor } from './extractors/DocxExtractor';
import { TextExtractor } from './extractors/TextExtractor';
import { MarkdownExtractor } from './extractors/MarkdownExtractor';
import { RtfExtractor } from './extractors/RtfExtractor';
import { Logger } from '../../utils/Logger';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * DocIngestAgent is responsible for processing URLs and documents,
 * extracting text content, and preparing it for analysis.
 */
export class DocIngestAgent implements IDocIngestAgent {
    private config: DocIngestAgentConfig;
    private logger: Logger;
    private urlValidator: UrlValidator;
    private urlFetcher: UrlFetcher;
    private formatDetector: FileFormatDetector;
    private textNormalizer: TextNormalizer;
    private documentChunker: DocumentChunker;
    private htmlExtractor: HtmlExtractor;
    private pdfExtractor: PdfExtractor;
    private docxExtractor: DocxExtractor;
    private textExtractor: TextExtractor;
    private markdownExtractor: MarkdownExtractor;
    private rtfExtractor: RtfExtractor;
    private isInitialized: boolean = false;

    constructor(config: Partial<DocIngestAgentConfig> = {}, logger?: Logger) {
        this.config = {
            maxDocumentSize: 50 * 1024 * 1024, // 50MB default
            maxChunkSize: 10000, // 10K characters default
            chunkOverlap: 1000, // 1K characters overlap
            userAgent: 'MCP-DocIngestAgent/1.0',
            timeout: 30000, // 30 seconds
            retries: 3,
            followRedirects: true,
            ...config
        };

        this.logger = logger || new Logger('DocIngestAgent');
        this.urlValidator = new UrlValidator();
        this.urlFetcher = new UrlFetcher({
            userAgent: this.config.userAgent,
            timeout: this.config.timeout,
            maxRetries: this.config.retries,
            followRedirects: this.config.followRedirects
        });

        this.formatDetector = new FileFormatDetector();
        this.textNormalizer = new TextNormalizer();
        this.documentChunker = new DocumentChunker();

        // Initialize extractors
        this.htmlExtractor = new HtmlExtractor();
        this.pdfExtractor = new PdfExtractor();
        this.docxExtractor = new DocxExtractor();
        this.textExtractor = new TextExtractor();
        this.markdownExtractor = new MarkdownExtractor();
        this.rtfExtractor = new RtfExtractor();
    }

    /**
     * Initialize the agent and its dependencies
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.logger.info('Initializing DocIngestAgent');

        try {
            // Initialize each component
            await this.urlFetcher.initialize();
            await this.formatDetector.initialize();
            await this.textNormalizer.initialize();
            await this.documentChunker.initialize();

            // Initialize extractors
            await this.htmlExtractor.initialize();
            await this.pdfExtractor.initialize();
            await this.docxExtractor.initialize();
            await this.textExtractor.initialize();
            await this.markdownExtractor.initialize();
            await this.rtfExtractor.initialize();

            this.isInitialized = true;
            this.logger.info('DocIngestAgent initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize DocIngestAgent', error);
            throw error;
        }
    }

    /**
     * Process a URL and extract text content
     * @param url URL to process
     * @param options Chunking options
     */
    async processUrl(url: string, options?: Partial<ChunkOptions>): Promise<DocIngestResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.logger.info(`Processing URL: ${url}`);

        try {
            // Validate URL
            if (!this.urlValidator.isValidUrl(url)) {
                throw new Error(`Invalid URL: ${url}`);
            }

            // Fetch content from URL
            const { content, contentType, responseUrl } = await this.urlFetcher.fetch(url);

            // Detect format
            const { format } = this.formatDetector.detectFromMimeType(contentType);

            // Extract text based on format
            const extractedText = await this.extractText(content, format);

            // Normalize text
            const normalizedText = this.normalizeText(extractedText);

            // Generate chunks if needed
            const chunkingOptions = this.mergeChunkOptions(options);
            const textChunks = this.chunkText(normalizedText, chunkingOptions);

            // Create result
            const result: DocIngestResult = {
                sourceUrl: responseUrl || url,
                extractedText: normalizedText,
                textChunks,
                metadata: {
                    charCount: normalizedText.length,
                    mimeType: contentType
                },
                format,
                extractionTimestamp: new Date()
            };

            this.logger.info(`Successfully processed URL: ${url}, extracted ${normalizedText.length} characters`);
            return result;
        } catch (error) {
            this.logger.error(`Error processing URL: ${url}`, error);
            throw error;
        }
    }

    /**
     * Process a file and extract text content
     * @param filePath Path to the file
     * @param fileName Original filename
     * @param options Chunking options
     */
    async processFile(filePath: string, fileName: string, options?: Partial<ChunkOptions>): Promise<DocIngestResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.logger.info(`Processing file: ${fileName}`);

        try {
            // Check file size
            const stats = await fs.stat(filePath);
            if (stats.size > this.config.maxDocumentSize) {
                const error = new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxDocumentSize} bytes)`) as any;
                error.size = stats.size;
                error.limit = this.config.maxDocumentSize;
                throw error;
            }

            // Read file content
            const content = await fs.readFile(filePath);

            // Detect format from file extension and content
            const extension = path.extname(fileName).toLowerCase().substring(1);
            const { format } = this.formatDetector.detectFromFile(extension, content);

            // Extract text based on format
            const extractedText = await this.extractText(content, format);

            // Normalize text
            const normalizedText = this.normalizeText(extractedText);

            // Generate chunks if needed
            const chunkingOptions = this.mergeChunkOptions(options);
            const textChunks = this.chunkText(normalizedText, chunkingOptions);

            // Create result
            const result: DocIngestResult = {
                sourceFile: fileName,
                extractedText: normalizedText,
                textChunks,
                metadata: {
                    charCount: normalizedText.length
                },
                format,
                extractionTimestamp: new Date()
            };

            this.logger.info(`Successfully processed file: ${fileName}, extracted ${normalizedText.length} characters`);
            return result;
        } catch (error) {
            this.logger.error(`Error processing file: ${fileName}`, error);
            throw error;
        }
    }

    /**
     * Extract text from content based on format
     * @param content File or URL content
     * @param format Detected format
     */
    async extractText(content: Buffer, format: SupportedFileFormat): Promise<string> {
        this.logger.info(`Extracting text from ${format} content`);

        try {
            switch (format) {
                case 'html':
                    return await this.htmlExtractor.extract(content);
                case 'pdf':
                    return await this.pdfExtractor.extract(content);
                case 'docx':
                    return await this.docxExtractor.extract(content);
                case 'txt':
                    return await this.textExtractor.extract(content);
                case 'md':
                    return await this.markdownExtractor.extract(content);
                case 'rtf':
                    return await this.rtfExtractor.extract(content);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            this.logger.error(`Error extracting text from ${format} content`, error);
            throw error;
        }
    }

    /**
     * Normalize extracted text
     * @param text Raw extracted text
     */
    normalizeText(text: string): string {
        return this.textNormalizer.normalize(text);
    }

    /**
     * Split text into chunks for processing
     * @param text Text to chunk
     * @param options Chunking options
     */
    chunkText(text: string, options?: Partial<ChunkOptions>): string[] {
        const chunkingOptions = this.mergeChunkOptions(options);
        return this.documentChunker.chunk(text, chunkingOptions);
    }

    /**
     * Merge default chunk options with provided options
     * @param options User provided options
     */
    private mergeChunkOptions(options?: Partial<ChunkOptions>): ChunkOptions {
        return {
            maxChunkSize: this.config.maxChunkSize,
            overlap: this.config.chunkOverlap,
            preserveHeaders: true,
            includeMetadata: false,
            ...(options || {})
        };
    }
}
