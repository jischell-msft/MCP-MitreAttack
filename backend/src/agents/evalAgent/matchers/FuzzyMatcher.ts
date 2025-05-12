import { TechniqueModel } from '../../parseAgent/models/types';
import { RawMatch, TextPosition } from '../models/types';

export class FuzzyMatcher {
    private techniques: TechniqueModel[] = [];
    private techniquePhrases: Map<string, string[]> = new Map();

    /**
     * Initialize the fuzzy matcher with technique data
     */
    async initialize(techniques: TechniqueModel[]): Promise<void> {
        this.techniques = techniques;

        // Extract important phrases for each technique
        for (const technique of techniques) {
            const phrases = this.extractImportantPhrases(technique);
            this.techniquePhrases.set(technique.id, phrases);
        }
    }

    /**
     * Find fuzzy matches in the document text
     */
    async findMatches(text: string): Promise<RawMatch[]> {
        const matches: RawMatch[] = [];

        // Process document in sliding windows
        const windowSize = 100;
        const stride = 50;

        for (let i = 0; i < text.length; i += stride) {
            const windowEnd = Math.min(i + windowSize, text.length);
            const window = text.substring(i, windowEnd);

            // Check each technique
            for (const technique of this.techniques) {
                const phrases = this.techniquePhrases.get(technique.id) || [];

                for (const phrase of phrases) {
                    // Skip very short phrases
                    if (phrase.length < 4) continue;

                    // Find fuzzy matches in the window
                    const fuzzyMatches = this.findFuzzyMatches(window, phrase);

                    for (const fuzzyMatch of fuzzyMatches) {
                        const globalPosition: TextPosition = {
                            startChar: i + fuzzyMatch.position.startChar,
                            endChar: i + fuzzyMatch.position.endChar
                        };

                        matches.push({
                            techniqueId: technique.id,
                            techniqueName: technique.name,
                            tactics: technique.tactics || [],
                            matchedText: fuzzyMatch.text,
                            position: globalPosition,
                            fuzzyScore: fuzzyMatch.similarity,
                            matchSource: "fuzzy"
                        });
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Extract important phrases from a technique
     */
    private extractImportantPhrases(technique: TechniqueModel): string[] {
        const phrases: string[] = [];

        // Add technique name
        phrases.push(technique.name);

        // Extract key phrases from description
        if (technique.description) {
            // Split description into sentences
            const sentences = technique.description.split(/[.!?]+/);

            for (const sentence of sentences) {
                // Focus on shorter sentences which are often more definitional
                if (sentence.length > 5 && sentence.length < 100) {
                    phrases.push(sentence.trim());
                }
            }
        }

        // Add keywords if available
        if (technique.keywords && Array.isArray(technique.keywords)) {
            phrases.push(...technique.keywords);
        }

        return phrases;
    }

    /**
     * Find fuzzy matches in a text window
     */
    private findFuzzyMatches(text: string, phrase: string): Array<{
        text: string;
        similarity: number;
        position: TextPosition;
    }> {
        const results = [];
        const minLength = Math.max(4, Math.floor(phrase.length * 0.5));

        // Convert phrase into ngrams for fuzzy matching
        const phraseNgrams = this.getNgrams(phrase.toLowerCase(), 3);

        // Sliding window over the text
        for (let i = 0; i < text.length - minLength; i++) {
            // Check different possible match lengths
            for (let len = minLength; len <= Math.min(phrase.length * 2, text.length - i); len++) {
                const candidate = text.substring(i, i + len);

                // Skip if the candidate is too short
                if (candidate.length < minLength) continue;

                // Calculate similarity using ngram overlap
                const candidateNgrams = this.getNgrams(candidate.toLowerCase(), 3);
                const similarity = this.calculateNgramSimilarity(phraseNgrams, candidateNgrams);

                // Only consider matches above a threshold
                if (similarity > 0.6) {
                    results.push({
                        text: candidate,
                        similarity,
                        position: {
                            startChar: i,
                            endChar: i + len
                        }
                    });

                    // Skip ahead to avoid overlapping matches
                    i += Math.floor(len * 0.7);
                    break;
                }
            }
        }

        return results;
    }

    /**
     * Get character n-grams from text
     */
    private getNgrams(text: string, n: number): Set<string> {
        const ngrams = new Set<string>();

        for (let i = 0; i <= text.length - n; i++) {
            ngrams.add(text.substring(i, i + n));
        }

        return ngrams;
    }

    /**
     * Calculate similarity between two sets of ngrams
     */
    private calculateNgramSimilarity(ngramsA: Set<string>, ngramsB: Set<string>): number {
        let intersection = 0;

        for (const ngram of ngramsA) {
            if (ngramsB.has(ngram)) {
                intersection++;
            }
        }

        const union = ngramsA.size + ngramsB.size - intersection;
        return union === 0 ? 0 : intersection / union;
    }
}
