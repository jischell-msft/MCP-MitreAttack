import { logger } from '../../utils/logger';

/**
 * Extract version information from MITRE ATT&CK data
 * @param mitreData Raw MITRE ATT&CK STIX data
 * @returns Version string
 */
export function extractVersionFromMitreData(mitreData: any): string {
    try {
        // First, check if there's a bundle with spec_version
        if (mitreData && mitreData.spec_version) {
            // This is STIX 2.0 format
            return `STIX-${mitreData.spec_version}`;
        }

        // Next, look for objects with type 'x-mitre-collection' which should contain the version
        if (mitreData && Array.isArray(mitreData.objects)) {
            const collection = mitreData.objects.find(
                (obj: any) => obj.type === 'x-mitre-collection'
            );

            if (collection && collection.x_mitre_version) {
                return collection.x_mitre_version;
            }

            // Try to find a marking-definition with the version in it
            const marking = mitreData.objects.find(
                (obj: any) => obj.type === 'marking-definition' && obj.definition_type === 'statement'
            );

            if (marking && marking.definition && marking.definition.statement) {
                // Try to extract version from the statement text
                const match = marking.definition.statement.match(/version\s+(\d+(\.\d+)*)/i);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }

        // If we can't find a version in the data, generate a timestamp-based version
        // Format: YYYYMMDDHHmm
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        return `${year}${month}${day}${hour}${minute}`;
    } catch (error: any) {
        logger.warn(`Failed to extract MITRE version: ${error.message}`);
        return 'unknown';
    }
}

/**
 * Compare two version strings
 * @param versionA First version
 * @param versionB Second version
 * @returns -1 if A < B, 0 if A = B, 1 if A > B
 */
export function compareVersions(versionA: string, versionB: string): number {
    // If the versions are identical strings, they are equal
    if (versionA === versionB) {
        return 0;
    }

    // First try semantic versioning comparison
    const semverRegex = /^(\d+)\.(\d+)\.?(\d*)$/;
    const matchA = versionA.match(semverRegex);
    const matchB = versionB.match(semverRegex);

    if (matchA && matchB) {
        const majorA = parseInt(matchA[1], 10);
        const majorB = parseInt(matchB[1], 10);

        if (majorA !== majorB) {
            return majorA > majorB ? 1 : -1;
        }

        const minorA = parseInt(matchA[2], 10);
        const minorB = parseInt(matchB[2], 10);

        if (minorA !== minorB) {
            return minorA > minorB ? 1 : -1;
        }

        const patchA = matchA[3] ? parseInt(matchA[3], 10) : 0;
        const patchB = matchB[3] ? parseInt(matchB[3], 10) : 0;

        if (patchA !== patchB) {
            return patchA > patchB ? 1 : -1;
        }

        return 0;
    }

    // Handle STIX versions
    if (versionA.startsWith('STIX-') && versionB.startsWith('STIX-')) {
        return compareVersions(versionA.replace('STIX-', ''), versionB.replace('STIX-', ''));
    }

    // For date-based versions (YYYYMMDDHHmm)
    if (versionA.length === 12 && /^\d+$/.test(versionA) &&
        versionB.length === 12 && /^\d+$/.test(versionB)) {
        return versionA > versionB ? 1 : -1;
    }

    // Default to string comparison
    return versionA > versionB ? 1 : -1;
}
