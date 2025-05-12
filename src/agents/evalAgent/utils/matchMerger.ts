import { RawMatch, TextPosition } from '../models/types';

/**
 * Merge matches from different sources
 */
export function mergeMatches(rawMatches: RawMatch[]): RawMatch[] {
    if (!rawMatches.length) return [];

    // Sort matches by position
    const sortedMatches = [...rawMatches].sort((a, b) =>
        a.position.startChar - b.position.startChar
    );

    const mergedMatches: RawMatch[] = [];
    let currentGroup: RawMatch[] = [];
    let currentTechniqueId = sortedMatches[0].techniqueId;

    // Group matches by technique and overlapping positions
    for (const match of sortedMatches) {
        // If this is a new technique or non-overlapping position, process the current group
        if (match.techniqueId !== currentTechniqueId ||
            (currentGroup.length > 0 && !doPositionsOverlap(currentGroup[currentGroup.length - 1].position, match.position))) {

            if (currentGroup.length > 0) {
                mergedMatches.push(mergeMatchGroup(currentGroup));
                currentGroup = [];
            }

            currentTechniqueId = match.techniqueId;
        }

        currentGroup.push(match);
    }

    // Don't forget to process the last group
    if (currentGroup.length > 0) {
        mergedMatches.push(mergeMatchGroup(currentGroup));
    }

    // Add flag for techniques matched by multiple methods
    const techniqueMatchSources = new Map<string, Set<string>>();

    for (const match of rawMatches) {
        if (!techniqueMatchSources.has(match.techniqueId)) {
            techniqueMatchSources.set(match.techniqueId, new Set());
        }
        techniqueMatchSources.get(match.techniqueId)!.add(match.matchSource);
    }

    // Mark matches found by multiple methods
    for (const match of mergedMatches) {
        const sources = techniqueMatchSources.get(match.techniqueId);
        if (sources && sources.size > 1) {
            match.matchedByMultipleMethods = true;
        }
    }

    return mergedMatches;
}

/**
 * Check if two text positions overlap
 */
function doPositionsOverlap(posA: TextPosition, posB: TextPosition): boolean {
    // Check if position A overlaps with position B
    return (posA.startChar <= posB.endChar && posB.startChar <= posA.endChar);
}

/**
 * Merge a group of matches for the same technique in overlapping positions
 */
function mergeMatchGroup(group: RawMatch[]): RawMatch {
    if (group.length === 1) {
        return group[0];
    }

    // Find the match with the highest score
    let bestMatch = group[0];
    let bestScore = getBestScore(group[0]);

    for (let i = 1; i < group.length; i++) {
        const score = getBestScore(group[i]);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = group[i];
        }
    }

    // Combine the positions to cover the entire match area
    const startChar = Math.min(...group.map(m => m.position.startChar));
    const endChar = Math.max(...group.map(m => m.position.endChar));

    return {
        ...bestMatch,
        position: {
            startChar,
            endChar
        }
    };
}

/**
 * Get the best score from any matching method
 */
function getBestScore(match: RawMatch): number {
    const scores: number[] = [];

    if (match.keywordScore !== undefined) {
        scores.push(match.keywordScore);
    }

    if (match.tfidfScore !== undefined) {
        scores.push(match.tfidfScore);
    }

    if (match.fuzzyScore !== undefined) {
        scores.push(match.fuzzyScore);
    }

    return scores.length ? Math.max(...scores) : 0;
}
