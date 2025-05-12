import { logger } from '../../utils/logger';

// Common English stop words to filter out
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
    'which', 'this', 'that', 'these', 'those', 'then', 'just', 'so', 'than',
    'such', 'when', 'who', 'how', 'where', 'why', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
    'doing', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from',
    'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'could',
    'would', 'should', 'now', 'of'
]);

// Technical terms that are important to keep even if they're short
const TECHNICAL_TERMS = new Set([
    'ssh', 'api', 'rpc', 'ftp', 'dns', 'url', 'sql', 'xss', 'ssl', 'tls',
    'vpn', 'smb', 'cmd', 'exe', 'dll', 'tcp', 'udp', 'icmp', 'http', 'ssl',
    'vpn', 'apt', 'pdf', 'xls', 'csv', 'doc', 'ppt', 'zip', 'rar', 'tar',
    'git', 'php', 'pem', 'crt', 'key', 'log', 'mac', 'ip', 'os'
]);

// Common cybersecurity terms with synonyms (for keyword expansion)
const SYNONYM_MAP: Record<string, string[]> = {
    'malware': ['virus', 'trojan', 'ransomware', 'spyware', 'backdoor', 'worm'],
    'phishing': ['spoofing', 'social engineering', 'fake email'],
    'credential': ['password', 'authentication', 'login', 'account'],
    'encryption': ['cryptography', 'cipher', 'encrypt'],
    'decryption': ['decrypt', 'decipher'],
    'vulnerability': ['weakness', 'flaw', 'exploit', 'bug'],
    'authentication': ['identity', 'verification', 'validation', 'credential'],
    'authorization': ['permission', 'access control', 'privilege'],
    'command': ['instruction', 'directive', 'cmd', 'cli'],
    'script': ['code', 'program', 'macro', 'automation'],
    'injection': ['sql injection', 'code injection', 'payload'],
    'persistence': ['maintain access', 'backdoor', 'implant'],
    'lateral movement': ['pivot', 'spread', 'move'],
    'privilege escalation': ['admin rights', 'root access', 'elevation'],
    'exfiltration': ['data theft', 'extraction', 'leakage', 'stealing'],
    'obfuscation': ['hiding', 'masking', 'concealment', 'stealth'],
    'evasion': ['bypass', 'avoid detection', 'stealth']
};

/**
 * Class for extracting and processing keywords from technique descriptions
 */
export class KeywordExtractor {
    /**
     * Extract keywords from a technique description
     * @param text Text to extract keywords from
     * @param includeTitle Whether to include technique title as keywords
     * @param expandSynonyms Whether to expand keywords with synonyms
     * @returns Array of unique keywords
     */
    static extractKeywords(text: string, includeTitle: string = '', expandSynonyms: boolean = true): string[] {
        try {
            // Clean and normalize the text
            const sanitizedText = this.sanitizeText(text);
            let titleKeywords: string[] = [];

            // Process title separately if provided
            if (includeTitle && includeTitle.length > 0) {
                titleKeywords = this.extractKeywordsFromText(this.sanitizeText(includeTitle));
            }

            // Extract keywords from main text
            const textKeywords = this.extractKeywordsFromText(sanitizedText);

            // Combine keywords
            let keywords = [...new Set([...titleKeywords, ...textKeywords])];

            // Expand with synonyms if requested
            if (expandSynonyms) {
                keywords = this.expandWithSynonyms(keywords);
            }

            return keywords;
        } catch (error) {
            logger.warn(`Error extracting keywords: ${error}`);
            return [];
        }
    }

    /**
     * Sanitize and normalize text
     */
    private static sanitizeText(text: string): string {
        // Convert to lowercase
        let sanitized = text.toLowerCase();

        // Replace HTML tags and entities
        sanitized = sanitized.replace(/<[^>]*>/g, ' ');
        sanitized = sanitized.replace(/&[a-z]+;/g, ' ');

        // Replace special characters with spaces
        sanitized = sanitized.replace(/[^\w\s-]/g, ' ');

        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        return sanitized;
    }

    /**
     * Extract keywords from text
     */
    private static extractKeywordsFromText(text: string): string[] {
        // Split into words
        const words = text.split(/\s+/);

        // Filter out common words and keep important ones
        const filteredWords = words.filter(word => {
            // Keep technical terms regardless of length
            if (TECHNICAL_TERMS.has(word)) {
                return true;
            }

            // Filter out stop words
            if (STOP_WORDS.has(word)) {
                return false;
            }

            // Filter out short words (less than 3 characters)
            if (word.length < 3) {
                return false;
            }

            return true;
        });

        // Extract n-grams (phrases of 2-3 words that are meaningful)
        const ngrams = this.extractNgrams(words, 2, 3);

        // Combine individual words and n-grams
        return [...new Set([...filteredWords, ...ngrams])];
    }

    /**
     * Extract n-grams (phrases) from text
     */
    private static extractNgrams(words: string[], minSize: number, maxSize: number): string[] {
        const ngrams: string[] = [];

        // Skip if we don't have enough words
        if (words.length < minSize) {
            return ngrams;
        }

        // Generate n-grams of different sizes
        for (let size = minSize; size <= maxSize; size++) {
            for (let i = 0; i <= words.length - size; i++) {
                const candidateWords = words.slice(i, i + size);

                // Skip n-grams with too many stop words
                const stopWordCount = candidateWords.filter(word => STOP_WORDS.has(word)).length;
                if (stopWordCount > size / 2) {
                    continue;
                }

                const ngram = candidateWords.join(' ');
                ngrams.push(ngram);
            }
        }

        return ngrams;
    }

    /**
     * Expand keywords with known synonyms
     */
    private static expandWithSynonyms(keywords: string[]): string[] {
        const expanded: string[] = [...keywords];

        // Check each keyword against our synonym map
        for (const keyword of keywords) {
            // If the keyword is in our synonym map, add all synonyms
            if (SYNONYM_MAP[keyword]) {
                expanded.push(...SYNONYM_MAP[keyword]);
            }

            // Also check if the keyword is a synonym of anything in our map
            for (const [term, synonyms] of Object.entries(SYNONYM_MAP)) {
                if (synonyms.includes(keyword) && !expanded.includes(term)) {
                    expanded.push(term);
                }
            }
        }

        return [...new Set(expanded)];
    }
}
