import { RawMatch } from '../models/types';

/**
 * Calculate confidence score for a match (0-100)
 */
export function calculateConfidence(match: RawMatch, context: string): number {
    let score = 0;

    // Base score from primary match
    if (match.matchSource === "keyword" && match.keywordScore !== undefined) {
        score = match.keywordScore * 80; // 0-80 based on keyword match
    } else if (match.matchSource === "tfidf" && match.tfidfScore !== undefined) {
        score = match.tfidfScore * 80; // 0-80 based on cosine similarity
    } else if (match.matchSource === "fuzzy" && match.fuzzyScore !== undefined) {
        score = match.fuzzyScore * 70; // 0-70 based on fuzzy match ratio
    }

    // Bonus for multiple match types
    if (match.matchedByMultipleMethods) {
        score += 10;
    }

    // Context relevance boost
    if (containsRelatedTerms(context, match)) {
        score += 10;
    }

    // Penalties for potential false positives
    if (isCommonTerm(match.matchedText)) {
        score -= 15;
    }

    // Penalty for very short matches
    if (match.matchedText.length < 4) {
        score -= 20;
    }

    // Bonus for exact technique ID match
    if (match.matchedText.toUpperCase() === match.techniqueId) {
        score += 20;
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
}

/**
 * Check if context contains related terms that support the match
 */
function containsRelatedTerms(context: string, match: RawMatch): boolean {
    // Create a set of potential related terms
    const lowercaseContext = context.toLowerCase();

    // Terms that often indicate attack techniques
    const indicativeTerms = [
        'attack', 'exploit', 'vulnerability', 'malware', 'threat',
        'compromise', 'access', 'adversary', 'hacker', 'breach',
        'security', 'infection', 'backdoor', 'credential', 'command',
        'script', 'payload', 'execution', 'privilege', 'persistence'
    ];

    // Check for related terms in context
    const hasIndicativeTerms = indicativeTerms.some(term =>
        lowercaseContext.includes(term)
    );

    // Check if any tactics appear in the context
    const hasTacticMentions = (match.tactics || []).some(tactic =>
        lowercaseContext.includes(tactic.toLowerCase())
    );

    return hasIndicativeTerms || hasTacticMentions;
}

/**
 * Check if the matched text is a common term that might lead to false positives
 */
function isCommonTerm(text: string): boolean {
    const lowercaseText = text.toLowerCase();

    // Common terms that might lead to false positives
    const commonTerms = [
        'use', 'used', 'using', 'user', 'users',
        'system', 'systems', 'file', 'files',
        'process', 'data', 'information',
        'access', 'network', 'tool', 'tools',
        'control', 'server', 'service', 'application'
    ];

    return commonTerms.includes(lowercaseText);
}
