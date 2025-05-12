import { FormatDetectionResult, SupportedFileFormat } from '../models';
import { Logger } from '../../../utils/Logger';

/**
 * Utility for detecting file formats from content or MIME types
 */
export class FileFormatDetector {
    private logger: Logger;
    private extensionToFormatMap: Map<string, SupportedFileFormat>;
    private mimeTypeToFormatMap: Map<string, SupportedFileFormat>;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('FileFormatDetector');

        // Initialize extension mappings
        this.extensionToFormatMap = new Map<string, SupportedFileFormat>([
            ['html', 'html'],
            ['htm', 'html'],
            ['xhtml', 'html'],
            ['pdf', 'pdf'],
            ['docx', 'docx'],
            ['doc', 'docx'], // Treat doc as docx for simplicity, will fail if truly a .doc
            ['txt', 'txt'],
            ['text', 'txt'],
            ['md', 'md'],
            ['markdown', 'md'],
            ['rtf', 'rtf']
        ]);

        // Initialize MIME type mappings
        this.mimeTypeToFormatMap = new Map<string, SupportedFileFormat>([
            ['text/html', 'html'],
            ['application/xhtml+xml', 'html'],
            ['application/pdf', 'pdf'],
            ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
            ['application/msword', 'docx'], // Treat doc as docx for simplicity
            ['text/plain', 'txt'],
            ['text/markdown', 'md'],
            ['application/rtf', 'rtf'],
            ['text/rtf', 'rtf']
        ]);
    }

    /**
     * Initialize the format detector
     */
    async initialize(): Promise<void> {
        // Nothing to initialize for now, but keeping the method for consistency
        return Promise.resolve();
    }

    /**
     * Detect file format from file extension and content
     * @param extension File extension (without dot)
     * @param content File content
     * @returns Detected format
     */
    detectFromFile(extension: string, content: Buffer): FormatDetectionResult {
        // First try to detect from extension
        const extensionFormat = this.extensionToFormatMap.get(extension.toLowerCase());

        if (extensionFormat) {
            const mimeType = this.getMimeTypeFromFormat(extensionFormat);
            return { format: extensionFormat, mimeType };
        }

        // If extension detection failed, try to detect from content signatures
        return this.detectFromContent(content);
    }

    /**
     * Detect file format from MIME type
     * @param mimeType MIME type string
     * @returns Detected format
     */
    detectFromMimeType(mimeType: string): FormatDetectionResult {
        // Extract base MIME type without parameters
        const baseMimeType = mimeType.split(';')[0].trim().toLowerCase();

        // Look up in MIME type mapping
        const format = this.mimeTypeToFormatMap.get(baseMimeType);

        if (format) {
            return { format, mimeType: baseMimeType };
        }

        // Default to text
        this.logger.warn(`Unknown MIME type: ${mimeType}, defaulting to txt`);
        return { format: 'txt', mimeType: 'text/plain' };
    }

    /**
     * Detect file format from content using magic numbers and signatures
     * @param content File content
     * @returns Detected format
     */
    private detectFromContent(content: Buffer): FormatDetectionResult {
        // Check for PDF signature
        if (content.length >= 4 && content.toString('ascii', 0, 4) === '%PDF') {
            return { format: 'pdf', mimeType: 'application/pdf' };
        }

        // Check for Office Open XML (DOCX)
        if (content.length >= 4 &&
            content[0] === 0x50 && content[1] === 0x4B && content[2] === 0x03 && content[3] === 0x04) {
            // This is a ZIP file, which could be a DOCX
            return { format: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        }

        // Check for RTF
        if (content.length >= 5 && content.toString('ascii', 0, 5) === '{\\rtf') {
            return { format: 'rtf', mimeType: 'application/rtf' };
        }

        // Check for HTML
        if (content.length >= 10) {
            const start = content.toString('utf8', 0, Math.min(100, content.length)).toLowerCase();
            if (start.includes('<!doctype html>') || start.includes('<html') || start.includes('<head') ||
                start.includes('<body') || start.includes('<!--')) {
                return { format: 'html', mimeType: 'text/html' };
            }
        }

        // Check for Markdown (basic heuristic)
        if (content.length >= 20) {
            const text = content.toString('utf8', 0, Math.min(500, content.length));
            // Look for markdown headings, lists, links, or code blocks
            if ((text.match(/^#{1,6}\s/m) || text.match(/\n#{1,6}\s/m)) &&
                (text.includes('](') || text.includes('* ') || text.includes('- ') ||
                    text.includes('```') || text.includes('> '))) {
                return { format: 'md', mimeType: 'text/markdown' };
            }
        }

        // Default to plain text
        return { format: 'txt', mimeType: 'text/plain' };
    }

    /**
     * Get MIME type from format
     * @param format File format
     * @returns MIME type
     */
    private getMimeTypeFromFormat(format: SupportedFileFormat): string {
        switch (format) {
            case 'html':
                return 'text/html';
            case 'pdf':
                return 'application/pdf';
            case 'docx':
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'txt':
                return 'text/plain';
            case 'md':
                return 'text/markdown';
            case 'rtf':
                return 'application/rtf';
            default:
                return 'application/octet-stream';
        }
    }
}
