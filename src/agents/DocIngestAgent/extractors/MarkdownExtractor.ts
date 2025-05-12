import { Logger } from '../../../utils/Logger';

/**
 * Extractor for Markdown content
 */
export class MarkdownExtractor {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('MarkdownExtractor');
    }

    /**
     * Initialize the Markdown extractor
     */
    async initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Extract text content from Markdown
     * @param markdownBuffer Markdown content buffer
     * @returns Extracted text content
     */
    async extract(markdownBuffer: Buffer): Promise<string> {
        try {
            // Convert buffer to string
            const markdown = markdownBuffer.toString('utf8');

            // For markdown, we can keep most of the formatting as-is
            // Just clean up some common markdown elements

            // Remove code blocks but keep their content
            let text = markdown.replace(/```[\s\S]*?```/g, (match) => {
                // Extract content between the backticks
                const content = match.substring(3, match.length - 3).trim();
                return `\n\n${content}\n\n`;
            });

            // Convert inline code to plain text
            text = text.replace(/`([^`]+)`/g, '$1');

            // Convert links to readable format
            text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 [$2]');

            // Convert images to alt text
            text = text.replace(/!\[([^\]]+)\]\([^)]+\)/g, 'Image: $1');

            this.logger.info(`Extracted ${text.length} characters from Markdown`);
            return text;
        } catch (error) {
            this.logger.error('Error extracting text from Markdown', error);
            throw error;
        }
    }
}
