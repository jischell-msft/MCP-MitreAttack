import { TechniqueModel } from '../parseAgent/models/types';
import {
    EvalAgentConfig,
    EvalMatch,
    EvalResult,
    RawMatch,
    TextPosition
} from './models/types';
import { KeywordMatcher } from './matchers/KeywordMatcher';
import { TfidfMatcher } from './matchers/TfidfMatcher';
import { FuzzyMatcher } from './matchers/FuzzyMatcher';
import { extractContext } from './utils/contextExtractor';
import { calculateConfidence } from './utils/confidenceCalculator';
import { mergeMatches } from './utils/matchMerger';
import { generateSummary } from './utils/summaryGenerator';
import { Logger } from '../../utils/logger';

export class EvalAgent {
    private techniques: TechniqueModel[] = [];
    private config: EvalAgentConfig;
    private keywordMatcher: KeywordMatcher;
    private tfidfMatcher: TfidfMatcher;
    private fuzzyMatcher: FuzzyMatcher;
    private logger: Logger;

    constructor(config: EvalAgentConfig, logger?: Logger) {
        this.config = {
            minConfidenceScore: 65,
            maxMatches: 100,
            contextWindowSize: 200,
            useKeywordMatching: true,
            useTfIdfMatching: true,
            useFuzzyMatching: true,
            ...config
        };

        this.logger = logger || console;
        this.keywordMatcher = new KeywordMatcher();
        this.tfidfMatcher = new TfidfMatcher();
        this.fuzzyMatcher = new FuzzyMatcher();
    }

    /**
     * Initialize the EvalAgent with MITRE techniques
     */
    async initialize(techniques: TechniqueModel[]): Promise<void> {
        this.logger.info(`Initializing EvalAgent with ${techniques.length} techniques`);

        this.techniques = techniques;

        // Initialize the different matchers
        if (this.config.useKeywordMatching) {
            await this.keywordMatcher.initialize(techniques);
        }

        if (this.config.useTfIdfMatching) {
            await this.tfidfMatcher.initialize(techniques);
        }

        if (this.config.useFuzzyMatching) {
            await this.fuzzyMatcher.initialize(techniques);
        }

        this.logger.info('EvalAgent initialization complete');
    }

    /**
     * Evaluate a document against MITRE techniques
     */
    async evaluate(documentText: string, documentId: string = 'unknown'): Promise<EvalResult> {
        const startTime = Date.now();
        this.logger.info(`Starting evaluation of document ${documentId} (${documentText.length} chars)`);

        // Process the document
        const rawMatches: RawMatch[] = [];

        // Gather matches from different matchers
        if (this.config.useKeywordMatching) {
            const keywordMatches = await this.keywordMatcher.findMatches(documentText);
            rawMatches.push(...keywordMatches);
        }

        if (this.config.useTfIdfMatching) {
            const tfidfMatches = await this.tfidfMatcher.findMatches(documentText);
            rawMatches.push(...tfidfMatches);
        }

        if (this.config.useFuzzyMatching) {
            const fuzzyMatches = await this.fuzzyMatcher.findMatches(documentText);
            rawMatches.push(...fuzzyMatches);
        }

        // Merge matches from different sources
        const mergedMatches = mergeMatches(rawMatches);

        // Process matches to add context and calculate confidence
        const processedMatches = mergedMatches.map(match => this.processMatch(match, documentText));

        // Filter matches based on confidence threshold
        const filteredMatches = this.filterMatches(processedMatches);

        // Generate summary
        const summary = generateSummary(
            filteredMatches,
            documentId,
            Date.now() - startTime,
            this.techniques
        );

        this.logger.info(`Evaluation complete. Found ${filteredMatches.length} matches above threshold.`);

        return {
            matches: filteredMatches,
            summary
        };
    }

    /**
     * Evaluate a chunk of a document
     */
    async evaluateChunk(chunk: string): Promise<EvalMatch[]> {
        // Similar to evaluate but without generating a summary
        const rawMatches: RawMatch[] = [];

        if (this.config.useKeywordMatching) {
            const keywordMatches = await this.keywordMatcher.findMatches(chunk);
            rawMatches.push(...keywordMatches);
        }

        if (this.config.useTfIdfMatching) {
            const tfidfMatches = await this.tfidfMatcher.findMatches(chunk);
            rawMatches.push(...tfidfMatches);
        }

        if (this.config.useFuzzyMatching) {
            const fuzzyMatches = await this.fuzzyMatcher.findMatches(chunk);
            rawMatches.push(...fuzzyMatches);
        }

        const mergedMatches = mergeMatches(rawMatches);
        const processedMatches = mergedMatches.map(match => this.processMatch(match, chunk));
        return this.filterMatches(processedMatches);
    }

    /**
     * Process a raw match to add context and confidence score
     */
    private processMatch(match: RawMatch, text: string): EvalMatch {
        // Extract context around the matched text
        const context = this.extractContext(text, match.position);

        // Calculate confidence score
        const confidenceScore = this.getConfidenceScore(match, context);

        return {
            techniqueId: match.techniqueId,
            techniqueName: match.techniqueName,
            confidenceScore,
            matchedText: match.matchedText,
            context,
            textPosition: match.position,
            matchSource: match.matchSource
        };
    }

    /**
     * Calculate confidence score for a match
     */
    getConfidenceScore(match: RawMatch, context: string): number {
        return calculateConfidence(match, context);
    }

    /**
     * Extract context around a match
     */
    extractContext(text: string, position: TextPosition): string {
        return extractContext(text, position, this.config.contextWindowSize);
    }

    /**
     * Filter matches by confidence score and limit the number
     */
    filterMatches(matches: EvalMatch[]): EvalMatch[] {
        // Sort by confidence score descending
        const sortedMatches = [...matches].sort((a, b) => b.confidenceScore - a.confidenceScore);

        // Filter by minimum confidence
        const highConfidenceMatches = sortedMatches.filter(
            match => match.confidenceScore >= this.config.minConfidenceScore
        );

        // Limit to maximum number of matches
        return highConfidenceMatches.slice(0, this.config.maxMatches);
    }
}
