import * as cheerio from 'cheerio';
import { Logger } from '../../../utils/Logger';

/**
 * Extractor for HTML content
 */
export class HtmlExtractor {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('HtmlExtractor');
    }

    /**
     * Initialize the HTML extractor
     */
    async initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Extract text content from HTML
     * @param htmlBuffer HTML content buffer
     * @returns Extracted text content
     */
    async extract(htmlBuffer: Buffer): Promise<string> {
        try {
            // Convert buffer to string, handling encoding issues
            const html = htmlBuffer.toString('utf8');

            // Load HTML into cheerio
            const $ = cheerio.load(html, {
                decodeEntities: true,
                normalizeWhitespace: false
            });

            // Remove script and style elements
            $('script, style, noscript, svg, canvas, audio, video').remove();

            // Remove hidden elements
            $('[style*="display:none"], [style*="display: none"], [hidden], .hidden').remove();

            // Extract text from the main content area if present
            let mainContent = $('article, [role=main], main, #main, .main, .content, #content, .article, .post, .entry');

            // If no main content area was found, use the body
            if (mainContent.length === 0) {
                mainContent = $('body');
            }

            // Process text, preserving structure
            const extractedText = this.processNodeText($, mainContent);

            this.logger.info(`Extracted ${extractedText.length} characters from HTML`);
            return extractedText;
        } catch (error) {
            this.logger.error('Error extracting text from HTML', error);
            throw error;
        }
    }

    /**
     * Process node text, preserving structure
     * @param $ Cheerio instance
     * @param node Node to process
     * @returns Processed text
     */
    private processNodeText($: cheerio.CheerioAPI, node: cheerio.Cheerio): string {
        let text = '';

        node.each((i, elem) => {
            // Process headings with special formatting
            const tagName = $(elem).prop('tagName')?.toLowerCase() || '';

            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                text += '\n\n' + $(elem).text().trim() + '\n';
            }
            // Handle paragraphs and line breaks
            else if (tagName === 'p') {
                text += '\n\n' + $(elem).text().trim();
            }
            // Handle list items
            else if (tagName === 'li') {
                text += '\n• ' + $(elem).text().trim();
            }
            // Handle table cells
            else if (tagName === 'td' || tagName === 'th') {
                text += $(elem).text().trim() + '\t';
            }
            // Handle table rows
            else if (tagName === 'tr') {
                text += '\n' + $(elem).text().trim();
            }
            // Handle breaks
            else if (tagName === 'br') {
                text += '\n';
            }
            // Handle links with href
            else if (tagName === 'a' && $(elem).attr('href')) {
                const linkText = $(elem).text().trim();
                const href = $(elem).attr('href');
                text += `${linkText} [${href}]`;
            }
            // Default handling for other elements
            else {
                $(elem).contents().each((j, child) => {
                    if (child.type === 'text') {
                        text += $(child).text().trim() + ' ';
                    } else if (child.type === 'tag') {
                        text += this.processNodeText($, $(child));
                    }
                });
            }
        });

        return text;
    }
}
