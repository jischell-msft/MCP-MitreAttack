import { Logger } from '../../../utils/Logger';

/**
 * Extractor for plain text content
 */
export class TextExtractor {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('TextExtractor');
    }

    /**
     * Initialize the text extractor
     */
    async initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Extract text content from plain text
     * @param textBuffer Text content buffer
     * @returns Extracted text content
     */
    async extract(textBuffer: Buffer): Promise<string> {
        try {
            // Convert buffer to string, detect and handle encoding
            let text = textBuffer.toString('utf8');

            // Check for common encoding issues
            if (text.includes('�')) {
                // Try a different encoding
                text = textBuffer.toString('latin1');
            }

            this.logger.info(`Extracted ${text.length} characters from plain text`);
            return text;
        } catch (error) {
            this.logger.error('Error extracting text from plain text', error);
            throw error;
        }
    }
}
