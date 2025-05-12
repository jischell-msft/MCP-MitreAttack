import { TechniqueModel } from '../../parseAgent/models/types';
import { RawMatch, TextPosition } from '../models/types';
import { extractKeywords } from '../utils/keywordExtractor';

export class KeywordMatcher {
    private techniques: TechniqueModel[] = [];
    private techniqueKeywords: Map<string, string[]> = new Map();

    /**
     * Initialize the keyword matcher with technique data
     */
    async initialize(techniques: TechniqueModel[]): Promise<void> {
        this.techniques = techniques;

        // Extract keywords for each technique
        for (const technique of techniques) {
            const keywords = extractKeywords(technique);
            this.techniqueKeywords.set(technique.id, keywords);
        }
    }

    /**
     * Find keyword matches in the document text
     */
    async findMatches(text: string): Promise<RawMatch[]> {
        const matches: RawMatch[] = [];
        const lowercaseText = text.toLowerCase();

        for (const technique of this.techniques) {
            const keywords = this.techniqueKeywords.get(technique.id) || [];

            for (const keyword of keywords) {
                let position = 0;
                const lowercaseKeyword = keyword.toLowerCase();

                // Find all occurrences of the keyword
                while (position < lowercaseText.length) {
                    const index = lowercaseText.indexOf(lowercaseKeyword, position);
                    if (index === -1) break;

                    // Calculate keyword match score (0-1)
                    // Higher score for longer and more specific keywords
                    const keywordScore = Math.min(1, keyword.length / 20) * 0.8 + 0.2;

                    const textPosition: TextPosition = {
                        startChar: index,
                        endChar: index + keyword.length
                    };

                    // Extract the actual matched text from the original text
                    const matchedText = text.substring(textPosition.startChar, textPosition.endChar);

                    matches.push({
                        techniqueId: technique.id,
                        techniqueName: technique.name,
                        tactics: technique.tactics || [],
                        matchedText,
                        position: textPosition,
                        keywordScore,
                        matchSource: "keyword"
                    });

                    position = index + keyword.length;
                }
            }
        }

        return matches;
    }
}
