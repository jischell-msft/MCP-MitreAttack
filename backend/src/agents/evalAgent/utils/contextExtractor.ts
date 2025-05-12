import { TextPosition } from '../models/types';

/**
 * Extract context around a match position
 */
export function extractContext(text: string, position: TextPosition, windowSize: number): string {
    if (!text || text.length === 0) {
        return '';
    }

    // Calculate the context window boundaries
    const halfWindow = Math.floor(windowSize / 2);
    let startPos = Math.max(0, position.startChar - halfWindow);
    let endPos = Math.min(text.length, position.endChar + halfWindow);

    // Try to extend to sentence boundaries if possible
    const extendedStart = findSentenceBoundary(text, startPos, true);
    if (extendedStart !== -1 && extendedStart > startPos - 100) {
        startPos = extendedStart;
    }

    const extendedEnd = findSentenceBoundary(text, endPos, false);
    if (extendedEnd !== -1 && extendedEnd < endPos + 100) {
        endPos = extendedEnd;
    }

    // Extract the context
    return text.substring(startPos, endPos);
}

/**
 * Find sentence boundary near the given position
 */
function findSentenceBoundary(text: string, position: number, findStart: boolean): number {
    const sentenceBreaks = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

    if (findStart) {
        // Look backward for sentence start
        for (let i = position; i > 0; i--) {
            // Check if current position is after a sentence break
            for (const breakChar of sentenceBreaks) {
                const checkPos = i - breakChar.length;
                if (checkPos >= 0 && text.substring(checkPos, i) === breakChar) {
                    return i;
                }
            }

            // Also check for paragraph breaks
            if (i > 1 && text.substring(i - 2, i) === '\n\n') {
                return i;
            }
        }

        return 0; // Default to beginning of text
    } else {
        // Look forward for sentence end
        for (let i = position; i < text.length; i++) {
            for (const breakChar of sentenceBreaks) {
                if (i + breakChar.length <= text.length &&
                    text.substring(i, i + breakChar.length) === breakChar) {
                    return i + breakChar.length;
                }
            }

            // Check for paragraph breaks
            if (i < text.length - 2 && text.substring(i, i + 2) === '\n\n') {
                return i + 2;
            }
        }

        return text.length; // Default to end of text
    }
}
