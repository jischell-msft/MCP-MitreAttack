import { EvalMatch, EvalSummary } from '../models/types';
import { TechniqueModel } from '../../parseAgent/models/types';

/**
 * Generate summary information from matches
 */
export function generateSummary(
    matches: EvalMatch[],
    documentId: string,
    processingTimeMs: number,
    techniques: TechniqueModel[]
): EvalSummary {
    // Map of technique ID to tactics
    const tacticMap = new Map<string, string[]>();
    for (const technique of techniques) {
        tacticMap.set(technique.id, technique.tactics || []);
    }

    // Calculate match count
    const matchCount = matches.length;

    // Get top techniques by confidence score
    const topTechniques = matches
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 10)
        .map(match => match.techniqueId);

    // Calculate tactics coverage
    const tacticsCoverage: Record<string, number> = {};

    for (const match of matches) {
        const tactics = tacticMap.get(match.techniqueId) || [];

        for (const tactic of tactics) {
            tacticsCoverage[tactic] = (tacticsCoverage[tactic] || 0) + 1;
        }
    }

    return {
        documentId,
        matchCount,
        topTechniques,
        tacticsCoverage,
        processingTimeMs
    };
}
