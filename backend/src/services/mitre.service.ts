import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { startWorkflowAsync } from '../workflow/workflow.service';

// Track update status
let mitreUpdateInProgress = false;

/**
 * Get MITRE data status information
 */
export async function getMitreDataStatus(): Promise<{
    available: boolean;
    version: string;
    lastUpdated: string | null;
    techniqueCount: number;
}> {
    try {
        // Get the latest MITRE data version from database
        const versionResult = await db.get(`
      SELECT 
        version, 
        updated_at,
        (SELECT COUNT(*) FROM mitre_techniques) as techniqueCount
      FROM mitre_techniques
      ORDER BY updated_at DESC
      LIMIT 1
    `);

        if (!versionResult) {
            return {
                available: false,
                version: 'none',
                lastUpdated: null,
                techniqueCount: 0
            };
        }

        return {
            available: true,
            version: versionResult.version,
            lastUpdated: versionResult.updated_at,
            techniqueCount: versionResult.techniqueCount
        };
    } catch (error) {
        return {
            available: false,
            version: 'unknown',
            lastUpdated: null,
            techniqueCount: 0
        };
    }
}

/**
 * Start MITRE data update workflow
 */
export async function startUpdateWorkflow(): Promise<string> {
    const jobId = uuidv4();

    // Set update flag
    mitreUpdateInProgress = true;

    try {
        // Start update workflow
        await startWorkflowAsync('mitre-update', {}, jobId);

        // Return job ID
        return jobId;
    } catch (error) {
        // Reset flag on error
        mitreUpdateInProgress = false;
        throw error;
    }

    // The flag will be reset when the workflow completes
    // This would typically be handled by a workflow completion handler
}

/**
 * Check if MITRE update is in progress
 */
export function isUpdateInProgress(): boolean {
    return mitreUpdateInProgress;
}

/**
 * Reset update flag (would be called by workflow completion handler)
 */
export function resetUpdateFlag(): void {
    mitreUpdateInProgress = false;
}
