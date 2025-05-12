/**
 * Utility class for extracting keywords from technique descriptions
 */
export class KeywordExtractor {
    private stopWords: Set<string>;

    constructor() {
        this.stopWords = new Set<string>();
    }

    /**
     * Initialize the keyword extractor with stop words
     */
    async initialize(): Promise<void> {
        // Common English stop words
        const commonStopWords = [
            'a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'by',
            'be', 'being', 'been', 'am', 'is', 'are', 'was', 'were', 'in', 'into', 'of',
            'that', 'which', 'who', 'whom', 'whose', 'this', 'these', 'those', 'what',
            'with', 'within', 'about', 'from', 'as', 'until', 'while', 'during', 'throughout',
            'through', 'because', 'since', 'when', 'if', 'unless', 'although', 'than',
            'can', 'cannot', 'could', 'may', 'might', 'must', 'shall', 'should', 'will',
            'would', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
        ];

        for (const word of commonStopWords) {
            this.stopWords.add(word);
        }
    }

    /**
     * Extract keywords from text
     * @param text - Text to extract keywords from
     * @returns Array of keywords
     */
    extractKeywords(text: string): string[] {
        if (!text || text.trim() === '') {
            return [];
        }

        // Tokenize the text
        const tokens = this.tokenize(text);

        // Filter out stop words and short words
        const filteredTokens = tokens.filter(token =>
            token.length > 2 && !this.stopWords.has(token.toLowerCase())
        );

        // Extract technical terms (e.g., terms with uppercase letters, numbers, or special characters)
        const technicalTerms = this.extractTechnicalTerms(text);

        // Combine filtered tokens and technical terms, remove duplicates
        const keywords = [...new Set([...filteredTokens, ...technicalTerms])];

        return keywords;
    }

    /**
     * Tokenize text into individual words
     */
    private tokenize(text: string): string[] {
        // Remove punctuation and split by whitespace
        return text
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .split(' ');
    }

    /**
     * Extract technical terms from text
     */
    private extractTechnicalTerms(text: string): string[] {
        const technicalTerms: string[] = [];

        // Extract terms that might be technical (capitalized words not at the start of sentences)
        const capitalizedTerms = text.match(/(?<!\. )[A-Z][a-zA-Z0-9]+/g) || [];

        // Extract terms with special patterns like camelCase, PascalCase, snake_case
        const specialPatternTerms = text.match(/([a-z]+[A-Z][a-zA-Z0-9]*|[a-zA-Z]+_[a-zA-Z]+)/g) || [];

        // Extract terms related to file extensions
        const fileExtensions = text.match(/\.[a-zA-Z0-9]{2,4}\b/g) || [];

        // Extract common technical terms
        const commonTechTerms = this.extractCommonTechTerms(text);

        return [...new Set([...capitalizedTerms, ...specialPatternTerms, ...fileExtensions, ...commonTechTerms])];
    }

    /**
     * Extract common technical terms using a predefined list
     */
    private extractCommonTechTerms(text: string): string[] {
        // Common technical terms in cybersecurity and MITRE ATT&CK
        const commonTerms = [
            'malware', 'ransomware', 'trojan', 'virus', 'worm', 'backdoor', 'RAT',
            'C2', 'command and control', 'persistence', 'privilege', 'escalation',
            'lateral movement', 'execution', 'exfiltration', 'infiltration',
            'credential', 'password', 'authentication', 'registry', 'powershell',
            'script', 'exploit', 'vulnerability', 'CVE', 'payload', 'shellcode',
            'injection', 'memory', 'kernel', 'driver', 'rootkit', 'bootkit',
            'certificate', 'encryption', 'decryption', 'hash', 'DLL', 'executable',
            'API', 'syscall', 'service', 'process', 'thread', 'task', 'scheduled task',
            'proxy', 'VPN', 'tunnel', 'DNS', 'HTTP', 'HTTPS', 'SMB', 'SSH', 'FTP',
            'SMTP', 'network', 'port', 'protocol', 'packet', 'traffic', 'firewall'
        ];

        return commonTerms.filter(term =>
            text.toLowerCase().includes(term.toLowerCase())
        );
    }
}
