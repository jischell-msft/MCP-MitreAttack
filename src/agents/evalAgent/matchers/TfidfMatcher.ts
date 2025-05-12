import { TechniqueModel } from '../../parseAgent/models/types';
import { RawMatch, TextPosition } from '../models/types';

// Simple sparse vector representation
type SparseVector = Map<string, number>;

export class TfidfMatcher {
    private techniques: TechniqueModel[] = [];
    private techniqueVectors: Map<string, SparseVector> = new Map();
    private documentFrequency: Map<string, number> = new Map();
    private totalDocuments: number = 0;

    /**
     * Initialize the TF-IDF matcher with technique data
     */
    async initialize(techniques: TechniqueModel[]): Promise<void> {
        this.techniques = techniques;
        this.totalDocuments = techniques.length;

        // First pass: count document frequencies
        this.documentFrequency = this.calculateDocumentFrequency(techniques);

        // Second pass: create technique vectors
        for (const technique of techniques) {
            const vector = this.createTfIdfVector(this.tokenizeText(this.getTechniqueText(technique)));
            this.techniqueVectors.set(technique.id, vector);
        }
    }

    /**
     * Find TF-IDF similarity matches in the document text
     */
    async findMatches(text: string): Promise<RawMatch[]> {
        const documentVector = this.createTfIdfVector(this.tokenizeText(text));
        const matches: RawMatch[] = [];

        // Scan document in windows to find local matches
        const windowSize = 500;
        const stride = 250;

        for (let i = 0; i < text.length; i += stride) {
            const windowEnd = Math.min(i + windowSize, text.length);
            const window = text.substring(i, windowEnd);

            const windowTokens = this.tokenizeText(window);
            const windowVector = this.createTfIdfVector(windowTokens);

            // Compare window against each technique
            for (const technique of this.techniques) {
                const techniqueVector = this.techniqueVectors.get(technique.id);
                if (!techniqueVector) continue;

                const similarity = this.calculateCosineSimilarity(windowVector, techniqueVector);

                // Only consider matches above a certain threshold
                if (similarity > 0.2) {
                    // Find the best matching text in the window
                    const bestMatch = this.findBestMatchText(window, technique);

                    const textPosition: TextPosition = {
                        startChar: i + bestMatch.start,
                        endChar: i + bestMatch.end
                    };

                    matches.push({
                        techniqueId: technique.id,
                        techniqueName: technique.name,
                        tactics: technique.tactics || [],
                        matchedText: bestMatch.text,
                        position: textPosition,
                        tfidfScore: similarity,
                        matchSource: "tfidf"
                    });
                }
            }
        }

        return matches;
    }

    /**
     * Tokenize text into words
     */
    private tokenizeText(text: string): string[] {
        if (!text) return [];

        return text
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    /**
     * Get combined text for a technique
     */
    private getTechniqueText(technique: TechniqueModel): string {
        const textParts = [
            technique.name,
            technique.description
        ];

        if (technique.keywords && Array.isArray(technique.keywords)) {
            textParts.push(technique.keywords.join(' '));
        }

        return textParts.filter(Boolean).join(' ');
    }

    /**
     * Calculate document frequency for all terms
     */
    private calculateDocumentFrequency(techniques: TechniqueModel[]): Map<string, number> {
        const df = new Map<string, number>();

        for (const technique of techniques) {
            const text = this.getTechniqueText(technique);
            const terms = new Set(this.tokenizeText(text));

            for (const term of terms) {
                df.set(term, (df.get(term) || 0) + 1);
            }
        }

        return df;
    }

    /**
     * Create a TF-IDF vector for a set of tokens
     */
    private createTfIdfVector(tokens: string[]): SparseVector {
        const vector = new Map<string, number>();
        const termFrequency = new Map<string, number>();

        // Count term frequencies
        for (const token of tokens) {
            termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
        }

        // Calculate TF-IDF for each term
        for (const [term, tf] of termFrequency.entries()) {
            const df = this.documentFrequency.get(term) || 1;
            const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1; // Add 1 to avoid division by zero
            vector.set(term, tf * idf);
        }

        return vector;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private calculateCosineSimilarity(vecA: SparseVector, vecB: SparseVector): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        // Calculate dot product and magnitude of vector A
        for (const [term, weight] of vecA.entries()) {
            dotProduct += weight * (vecB.get(term) || 0);
            normA += weight * weight;
        }

        // Calculate magnitude of vector B
        for (const [_, weight] of vecB.entries()) {
            normB += weight * weight;
        }

        // Calculate cosine similarity
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Find the best matching text in a window
     */
    private findBestMatchText(window: string, technique: TechniqueModel): { text: string, start: number, end: number } {
        // Default to returning a portion of the window
        const defaultLength = Math.min(100, window.length);
        const defaultResult = {
            text: window.substring(0, defaultLength),
            start: 0,
            end: defaultLength
        };

        // Try to find a more specific match
        // Here we look for text that contains words from the technique name
        const nameWords = this.tokenizeText(technique.name);

        if (nameWords.length === 0) {
            return defaultResult;
        }

        // Look for sentences that contain the most name words
        const sentences = window.split(/[.!?]+/);
        let bestSentence = null;
        let bestScore = 0;
        let sentenceStart = 0;

        for (const sentence of sentences) {
            const sentenceTokens = new Set(this.tokenizeText(sentence));
            let score = 0;

            for (const word of nameWords) {
                if (sentenceTokens.has(word)) {
                    score++;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestSentence = sentence;
                // Keep track of the current sentence's position in the original window
                const nextSentenceStart = window.indexOf(sentence, sentenceStart) + sentence.length + 1;
                sentenceStart = nextSentenceStart > sentenceStart ? nextSentenceStart : sentenceStart;
            }
        }

        if (bestSentence && bestScore > 0) {
            const start = window.indexOf(bestSentence);
            return {
                text: bestSentence.trim(),
                start,
                end: start + bestSentence.length
            };
        }

        return defaultResult;
    }
}
