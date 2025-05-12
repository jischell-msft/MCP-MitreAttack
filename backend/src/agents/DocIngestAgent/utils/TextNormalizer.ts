import { Logger } from '../../../utils/Logger';

/**
 * Utility for normalizing text content
 */
export class TextNormalizer {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('TextNormalizer');
    }

    /**
     * Initialize the text normalizer
     */
    async initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Normalize text content
     * @param text Text to normalize
     * @returns Normalized text
     */
    normalize(text: string): string {
        if (!text) {
            return '';
        }

        try {
            let normalized = text;

            // Replace multiple spaces with a single space
            normalized = normalized.replace(/\s+/g, ' ');

            // Fix common Unicode issues
            normalized = this.normalizeUnicode(normalized);

            // Normalize line breaks
            normalized = this.normalizeLineBreaks(normalized);

            // Trim whitespace
            normalized = normalized.trim();

            return normalized;
        } catch (error) {
            this.logger.error('Error normalizing text', error);
            return text; // Return original text on error
        }
    }

    /**
     * Normalize Unicode characters
     * @param text Text to normalize
     * @returns Normalized text
     */
    private normalizeUnicode(text: string): string {
        // Normalize Unicode to NFC form (composed)
        let normalized = text.normalize('NFC');

        // Replace common problematic characters
        const replacements: [RegExp, string][] = [
            [/[\u2018\u2019]/g, "'"], // Smart single quotes
            [/[\u201C\u201D]/g, '"'], // Smart double quotes
            [/\u2026/g, '...'],      // Ellipsis
            [/\u2013/g, '-'],        // En dash
            [/\u2014/g, '--'],       // Em dash
            [/\u00A0/g, ' '],        // Non-breaking space
            [/\u00AD/g, '-'],        // Soft hyphen
            [/\u2022/g, '*'],        // Bullet
        ];

        for (const [pattern, replacement] of replacements) {
            normalized = normalized.replace(pattern, replacement);
        }

        return normalized;
    }

    /**
     * Normalize line breaks
     * @param text Text to normalize
     * @returns Normalized text
     */
    private normalizeLineBreaks(text: string): string {
        // Replace all line break variants with \n
        let normalized = text.replace(/\r\n|\r/g, '\n');

        // Replace more than 2 consecutive line breaks with just 2
        normalized = normalized.replace(/\n{3,}/g, '\n\n');

        return normalized;
    }

    /**
     * Detect the language of the text (placeholder)
     * In a real implementation, you would use a language detection library
     * @param text Text to analyze
     * @returns ISO language code
     */
    detectLanguage(text: string): string {
        // This is a simplified placeholder implementation
        // In a real app, use a proper language detection library
        if (text.length < 10) {
            return 'en'; // Default to English for short texts
        }

        // Simple heuristic checks for common languages
        // Just a placeholder for illustration
        const sample = text.slice(0, 1000).toLowerCase();

        if (sample.includes('the') && sample.includes('and') && sample.includes('is')) {
            return 'en'; // English
        } else if (sample.includes('der') && sample.includes('und') && sample.includes('ist')) {
            return 'de'; // German
        } else if (sample.includes('le') && sample.includes('et') && sample.includes('est')) {
            return 'fr'; // French
        } else if (sample.includes('el') && sample.includes('y') && sample.includes('es')) {
            return 'es'; // Spanish
        }

        return 'en'; // Default to English
    }
}
