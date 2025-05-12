import { TechniqueModel } from '../../parseAgent/models/types';

// Stop words to filter out
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'to', 'of', 'for', 'in', 'on', 'by', 'with',
    'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between',
    'out', 'at', 'during', 'since', 'without', 'under', 'within', 'this',
    'that', 'these', 'those', 'may', 'can', 'will', 'should', 'would',
    'could', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'from'
]);

/**
 * Extract relevant keywords from a technique
 */
export function extractKeywords(technique: TechniqueModel): string[] {
    const keywords = new Set<string>();

    // Add technique ID as a potential keyword
    keywords.add(technique.id);

    // Process technique name
    const nameWords = extractWordsFromText(technique.name);
    if (nameWords.length > 1) {
        // Add full technique name
        keywords.add(technique.name);

        // Add individual significant words from name
        for (const word of nameWords) {
            if (!STOP_WORDS.has(word.toLowerCase()) && word.length > 3) {
                keywords.add(word);
            }
        }
    }

    // Process description for additional keywords
    if (technique.description) {
        // Look for specific patterns in the description 
        // that might indicate important keywords
        const descWords = extractWordsFromText(technique.description);

        // Get phrases in quotes as they often represent specific terms
        const quotedPhrases = extractQuotedPhrases(technique.description);
        for (const phrase of quotedPhrases) {
            if (phrase.length > 3) {
                keywords.add(phrase);
            }
        }

        // Add specific technical terms that appear in the description
        for (const word of descWords) {
            if (isTechnicalTerm(word) && word.length > 3) {
                keywords.add(word);
            }
        }
    }

    // Add keywords from technique if available
    if (technique.keywords && Array.isArray(technique.keywords)) {
        for (const keyword of technique.keywords) {
            keywords.add(keyword);
        }
    }

    return Array.from(keywords);
}

/**
 * Extract words from text
 */
function extractWordsFromText(text: string): string[] {
    if (!text) return [];

    // Remove common punctuation and split by whitespace
    return text
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 0);
}

/**
 * Extract phrases enclosed in quotes
 */
function extractQuotedPhrases(text: string): string[] {
    if (!text) return [];

    const phrases: string[] = [];
    const regex = /"([^"]*)"/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
            phrases.push(match[1]);
        }
    }

    return phrases;
}

/**
 * Check if a word is likely a technical term
 */
function isTechnicalTerm(word: string): boolean {
    // Simple heuristic for technical terms
    // Usually they are camelCase, PascalCase, have numbers, or specific endings
    const technicalPatterns = [
        /[A-Z][a-z]+[A-Z]/, // camelCase or PascalCase
        /\d+/,              // Contains numbers
        /\.exe$/i,          // Executable files
        /\.dll$/i,          // DLL files
        /([Pp]rotocol|[Ss]erver|[Ss]cript|[Aa]dmin|[Pp]ayload|[Mm]alware|[Tt]rojan|[Ee]xploit)/
    ];

    return technicalPatterns.some(pattern => pattern.test(word));
}
