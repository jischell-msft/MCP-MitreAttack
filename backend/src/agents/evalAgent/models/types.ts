import { TechniqueModel } from '../../parseAgent/models/types';

/**
 * Configuration options for the EvalAgent
 */
export interface EvalAgentConfig {
    minConfidenceScore: number;    // Minimum confidence score (0-100)
    maxMatches: number;            // Maximum matches to return
    contextWindowSize: number;     // Number of characters for context
    useKeywordMatching: boolean;   // Whether to use keyword matching
    useTfIdfMatching: boolean;     // Whether to use TF-IDF matching
    useFuzzyMatching: boolean;     // Whether to use fuzzy matching
}

/**
 * Position of a match in the document text
 */
export interface TextPosition {
    startChar: number;
    endChar: number;
}

/**
 * Represents a match between document text and a MITRE technique
 */
export interface EvalMatch {
    techniqueId: string;        // MITRE technique ID
    techniqueName: string;      // Technique name
    confidenceScore: number;    // Match confidence (0-100)
    matchedText: string;        // The text that triggered the match
    context: string;            // Surrounding text (for context)
    textPosition: TextPosition; // Position in document
    matchSource: "keyword" | "tfidf" | "fuzzy";  // Source of the match
}

/**
 * Summary of the evaluation results
 */
export interface EvalSummary {
    documentId: string;         // Document reference
    matchCount: number;         // Total matches found
    topTechniques: string[];    // Highest confidence matches
    tacticsCoverage: Record<string, number>;  // Tactics distribution
    processingTimeMs: number;   // Total processing time
}

/**
 * Result of document evaluation
 */
export interface EvalResult {
    matches: EvalMatch[];
    summary: EvalSummary;
}

/**
 * Raw match data before final processing
 */
export interface RawMatch {
    techniqueId: string;
    techniqueName: string;
    tactics: string[];
    matchedText: string;
    position: TextPosition;
    keywordScore?: number;
    tfidfScore?: number;
    fuzzyScore?: number;
    matchSource: "keyword" | "tfidf" | "fuzzy";
    matchedByMultipleMethods?: boolean;
}
