import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { detect as detectLanguage } from 'langdetect';
import * as url from 'url';

/**
 * Configuration options for the DocIngestAgent
 */
export interface DocIngestAgentConfig {
    maxDocumentSize: number;      // Maximum document size in bytes
    maxChunkSize: number;         // Maximum chunk size in characters
    chunkOverlap: number;         // Overlap between chunks in characters
    userAgent: string;            // User agent for HTTP requests
    timeout: number;              // Timeout for HTTP requests in ms
    retries: number;              // Number of retries for failed requests
    followRedirects: boolean;     // Whether to follow redirects
    cachePath?: string;           // Optional path to cache directory
}

/**
 * Result of document processing
 */
export interface DocIngestResult {
    sourceUrl?: string;           // Original URL if applicable
    sourceFile?: string;          // Original filename if applicable
    extractedText: string;        // Full extracted text
    textChunks?: string[];        // Text broken into processable chunks
    documentContent: string;      // The content ready for evaluation
    documentChunks?: string[];    // Document broken into processable chunks
    metadata: {                   // Document metadata
        title?: string;
        author?: string;
        createdDate?: Date;
        pageCount?: number;
        charCount: number;
        language?: string;
        mimeType?: string;
    }
    format: string;               // Detected format (pdf, docx, html, txt)
    extractionTimestamp: Date;    // When processing completed
}

/**
 * DocIngestAgent is responsible for fetching and extracting text from URLs and documents
 */
export class DocIngestAgent {
    private config: DocIngestAgentConfig;
    private initialized: boolean = false;
    private supportedFormats = ['pdf', 'docx', 'html', 'txt', 'md', 'rtf'];

    /**
     * Create a new DocIngestAgent
     * @param config Configuration options
     */
    constructor(config: Partial<DocIngestAgentConfig> = {}) {
        this.config = {
            maxDocumentSize: config.maxDocumentSize || 50 * 1024 * 1024, // 50MB default
            maxChunkSize: config.maxChunkSize || 10000, // 10K chars default
            chunkOverlap: config.chunkOverlap || 500, // 500 chars default
            userAgent: config.userAgent || 'DocIngestAgent/1.0',
            timeout: config.timeout || 30000, // 30 seconds default
            retries: config.retries || 3, // 3 retries default
            followRedirects: config.followRedirects !== false, // true by default
            cachePath: config.cachePath || path.join(process.cwd(), 'cache', 'documents'),
        };
    }

    /**
     * Initialize the agent
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Ensure cache directory exists
        if (this.config.cachePath) {
            await fs.mkdir(this.config.cachePath, { recursive: true });
        }

        this.initialized = true;
    }

    /**
     * Process a URL to extract text
     * @param url URL to process
     * @returns Document ingest result
     */
    public async processUrl(urlToProcess: string): Promise<DocIngestResult> {
        this.validateUrl(urlToProcess);

        const content = await this.fetchUrl(urlToProcess);
        const format = this.detectFormatFromUrl(urlToProcess);
        const extractedText = await this.extractText(content, format);

        // Normalize and chunk the text
        const normalizedText = this.normalizeText(extractedText);
        const chunks = this.chunkText(normalizedText);

        // Create metadata
        const metadata = {
            title: this.extractTitleFromUrl(urlToProcess),
            charCount: normalizedText.length,
        };

        return {
            sourceUrl: urlToProcess,
            extractedText: normalizedText,
            textChunks: chunks,
            documentContent: normalizedText,
            documentChunks: chunks,
            metadata,
            format,
            extractionTimestamp: new Date()
        };
    }

    /**
     * Process a file to extract text
     * @param filePath Path to the file
     * @param fileName Original filename
     * @returns Document ingest result
     */
    public async processFile(filePath: string, fileName: string): Promise<DocIngestResult> {
        // Read the file
        const fileData = await fs.readFile(filePath);

        // Check file size
        if (fileData.length > this.config.maxDocumentSize) {
            throw new Error(`File size exceeds maximum (${fileData.length} > ${this.config.maxDocumentSize})`);
        }

        // Detect format and extract text
        const format = this.detectFormatFromFilename(fileName);
        const extractedText = await this.extractText(fileData, format);

        // Normalize and chunk the text
        const normalizedText = this.normalizeText(extractedText);
        const chunks = this.chunkText(normalizedText);

        // Create metadata
        const metadata = {
            title: path.basename(fileName, path.extname(fileName)),
            charCount: normalizedText.length,
        };

        return {
            sourceFile: fileName,
            extractedText: normalizedText,
            textChunks: chunks,
            documentContent: normalizedText,
            documentChunks: chunks,
            metadata,
            format,
            extractionTimestamp: new Date()
        };
    }

    /**
     * Extract text from content based on format
     * @param content Raw content buffer
     * @param format Detected format
     * @returns Extracted text
     */
    public async extractText(content: Buffer, format: string): Promise<string> {
        // Validate inputs
        if (!content || content.length === 0) {
            throw new Error('No content provided for extraction');
        }

        if (!format || !this.supportedFormats.includes(format.toLowerCase())) {
            throw new Error(`Unsupported format: ${format}`);
        }

        // Extract text based on format
        switch (format.toLowerCase()) {
            case 'pdf':
                return await this.extractFromPdf(content);
            case 'docx':
                return await this.extractFromDocx(content);
            case 'html':
                return await this.extractFromHtml(content);
            case 'txt':
                return content.toString('utf8');
            case 'md':
                return content.toString('utf8');
            case 'rtf':
                return await this.extractFromRtf(content);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Normalize text for processing
     * @param text Raw extracted text
     * @returns Normalized text
     */
    public normalizeText(text: string): string {
        if (!text) return '';

        // Normalize whitespace and line breaks
        let normalized = text
            .replace(/\r\n/g, '\n')           // Normalize line breaks
            .replace(/\t/g, ' ')              // Convert tabs to spaces
            .replace(/[ \t]+/g, ' ')          // Collapse multiple spaces
            .replace(/\n{3,}/g, '\n\n')       // Collapse multiple line breaks
            .trim();                          // Remove leading/trailing whitespace

        // Convert common Unicode characters to ASCII equivalents
        normalized = normalized
            .replace(/[\u2018\u2019]/g, "'")  // Smart quotes (single)
            .replace(/[\u201C\u201D]/g, '"')  // Smart quotes (double)
            .replace(/\u2013/g, '-')          // En dash
            .replace(/\u2014/g, '--')         // Em dash
            .replace(/\u2026/g, '...')        // Ellipsis

        // Detect language (optional - only if text is long enough)
        if (normalized.length > 100) {
            try {
                const detection = detectLanguage(normalized.substring(0, 1000));
                if (detection && detection.length > 0) {
                    // Store this for metadata but don't modify text
                }
            } catch (error) {
                // Ignore language detection errors
            }
        }

        return normalized;
    }

    /**
     * Split text into chunks of manageable size
     * @param text Normalized text to chunk
     * @returns Array of text chunks
     */
    public chunkText(text: string): string[] {
        if (!text) return [];

        // If text is smaller than max chunk size, return as single chunk
        if (text.length <= this.config.maxChunkSize) {
            return [text];
        }

        const chunks: string[] = [];
        const paragraphs = text.split(/\n{2,}/);
        let currentChunk = '';

        // Process paragraph by paragraph
        for (const paragraph of paragraphs) {
            // If adding this paragraph would exceed chunk size
            if (currentChunk.length + paragraph.length + 2 > this.config.maxChunkSize) {
                // If current chunk has content, add it to chunks
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);

                    // Start new chunk with overlap from previous chunk
                    const overlapStart = Math.max(0, currentChunk.length - this.config.chunkOverlap);
                    currentChunk = currentChunk.substring(overlapStart) + '\n\n';
                }
            }

            // Add paragraph to current chunk
            currentChunk += paragraph + '\n\n';

            // If current chunk is larger than max size (can happen with very large paragraphs)
            if (currentChunk.length > this.config.maxChunkSize) {
                // Split the chunk forcibly at maxChunkSize
                while (currentChunk.length > this.config.maxChunkSize) {
                    // Find a good breaking point near maxChunkSize
                    let breakPoint = currentChunk.lastIndexOf(' ', this.config.maxChunkSize);
                    if (breakPoint === -1 || breakPoint < this.config.maxChunkSize * 0.5) {
                        // If no good breaking point, just split at maxChunkSize
                        breakPoint = this.config.maxChunkSize;
                    }

                    // Add chunk up to break point
                    chunks.push(currentChunk.substring(0, breakPoint).trim());

                    // Create overlap for next chunk
                    const overlapStart = Math.max(0, breakPoint - this.config.chunkOverlap);
                    currentChunk = currentChunk.substring(overlapStart);
                }
            }
        }

        // Add final chunk if it has content
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Validate a URL
     * @param url URL to validate
     */
    private validateUrl(urlToValidate: string): void {
        try {
            const parsedUrl = new URL(urlToValidate);

            // Check protocol
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
            }

            // Block local/internal addresses
            const hostname = parsedUrl.hostname.toLowerCase();
            if (hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.endsWith('.local')) {
                throw new Error(`Local addresses not allowed: ${hostname}`);
            }
        } catch (error) {
            throw new Error(`Invalid URL: ${error.message}`);
        }
    }

    /**
     * Fetch content from a URL
     * @param url URL to fetch
     * @returns Buffer containing the fetched content
     */
    private async fetchUrl(urlToFetch: string): Promise<Buffer> {
        let retries = this.config.retries;
        let lastError: Error | null = null;

        while (retries >= 0) {
            try {
                const response = await axios.get(urlToFetch, {
                    headers: {
                        'User-Agent': this.config.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
                        'Accept-Language': 'en-US,en;q=0.9'
                    },
                    responseType: 'arraybuffer',
                    timeout: this.config.timeout,
                    maxRedirects: this.config.followRedirects ? 5 : 0,
                    validateStatus: (status) => status >= 200 && status < 300
                });

                // Check content size
                if (response.data.length > this.config.maxDocumentSize) {
                    throw new Error(`Content size exceeds maximum (${response.data.length} > ${this.config.maxDocumentSize})`);
                }

                // Return content as buffer
                return Buffer.from(response.data);
            } catch (error) {
                lastError = error;
                retries--;

                // Wait before retrying (exponential backoff)
                if (retries >= 0) {
                    const delay = Math.pow(2, this.config.retries - retries) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed to fetch URL after ${this.config.retries} retries: ${lastError?.message}`);
    }

    /**
     * Detect format from URL
     * @param url URL to analyze
     * @returns Detected format
     */
    private detectFormatFromUrl(urlToAnalyze: string): string {
        const parsedUrl = new URL(urlToAnalyze);
        const pathname = parsedUrl.pathname.toLowerCase();

        // Check extension
        if (pathname.endsWith('.pdf')) return 'pdf';
        if (pathname.endsWith('.docx')) return 'docx';
        if (pathname.endsWith('.doc')) return 'doc';
        if (pathname.endsWith('.txt')) return 'txt';
        if (pathname.endsWith('.md')) return 'md';
        if (pathname.endsWith('.rtf')) return 'rtf';

        // Default to html for web pages
        return 'html';
    }

    /**
     * Detect format from filename
     * @param filename Filename to analyze
     * @returns Detected format
     */
    private detectFormatFromFilename(filename: string): string {
        const ext = path.extname(filename).toLowerCase().substring(1);

        // Directly map extension to format
        if (this.supportedFormats.includes(ext)) {
            return ext;
        }

        // Special cases
        if (ext === 'doc') return 'docx'; // Try to process as docx anyway

        // Default to txt if we can't determine
        return 'txt';
    }

    /**
     * Extract text from PDF
     * @param content PDF content
     * @returns Extracted text
     */
    private async extractFromPdf(content: Buffer): Promise<string> {
        try {
            const result = await pdfParse(content);

            const metadata = {
                title: result.info.Title,
                author: result.info.Author,
                pageCount: result.numpages,
            };

            return result.text;
        } catch (error) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from DOCX
     * @param content DOCX content
     * @returns Extracted text
     */
    private async extractFromDocx(content: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer: content });

            // Extract metadata if needed (requires different approach)

            return result.value;
        } catch (error) {
            throw new Error(`DOCX extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from HTML
     * @param content HTML content
     * @returns Extracted text
     */
    private async extractFromHtml(content: Buffer): Promise<string> {
        try {
            const html = content.toString('utf8');
            const $ = cheerio.load(html);

            // Remove script and style elements
            $('script, style, noscript, iframe, svg').remove();

            // Extract title for metadata
            const title = $('title').text().trim();

            // Find the main content (heuristics)
            let mainContent = $('main, article, #content, #main, .content, .main');

            // If no main content found, use the body
            if (mainContent.length === 0) {
                mainContent = $('body');
            }

            // Extract text from paragraphs, headers, and other relevant elements
            let textContent = '';

            // Get all headers
            const headers = mainContent.find('h1, h2, h3, h4, h5, h6');
            headers.each((i, el) => {
                textContent += `${$(el).text().trim()}\n\n`;
            });

            // Get all paragraphs
            const paragraphs = mainContent.find('p');
            paragraphs.each((i, el) => {
                textContent += `${$(el).text().trim()}\n\n`;
            });

            // Get all list items
            const listItems = mainContent.find('li');
            listItems.each((i, el) => {
                textContent += `- ${$(el).text().trim()}\n`;
            });

            // Get all table cells
            const tables = mainContent.find('table');
            tables.each((i, table) => {
                textContent += '\n';
                $(table).find('tr').each((j, row) => {
                    const cells = $(row).find('td, th');
                    const rowContent = cells
                        .map((k, cell) => $(cell).text().trim())
                        .get()
                        .join(' | ');
                    textContent += `${rowContent}\n`;
                });
                textContent += '\n';
            });

            // If we didn't get much content, fall back to all text
            if (textContent.length < 200) {
                textContent = mainContent.text();
            }

            return textContent;
        } catch (error) {
            throw new Error(`HTML extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from RTF
     * @param content RTF content
     * @returns Extracted text
     */
    private async extractFromRtf(content: Buffer): Promise<string> {
        // Basic RTF extraction - strips control codes
        // For proper RTF parsing, a dedicated library would be needed
        try {
            let text = content.toString('utf8');

            // Remove RTF control codes
            text = text.replace(/\\[a-z0-9]+/g, ' ');
            text = text.replace(/\{.*?\}/g, ' ');
            text = text.replace(/}/g, ' ');
            text = text.replace(/\\/g, ' ');

            // Normalize whitespace
            text = text.replace(/\s+/g, ' ').trim();

            return text;
        } catch (error) {
            throw new Error(`RTF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract title from URL
     * @param url URL to analyze
     * @returns Best guess at document title
     */
    private extractTitleFromUrl(urlToAnalyze: string): string {
        try {
            const parsedUrl = new URL(urlToAnalyze);

            // Extract last part of path (filename)
            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];

                // Remove extension and decode
                const withoutExt = lastPart.split('.')[0];
                return decodeURIComponent(withoutExt).replace(/-|_/g, ' ');
            }

            // Fall back to hostname
            return parsedUrl.hostname;
        } catch (error) {
            // If URL parsing fails, return the URL as is
            return urlToAnalyze;
        }
    }
}
