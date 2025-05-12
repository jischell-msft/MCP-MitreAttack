import { z } from 'zod';

/**
 * Document workflow definition
 * This workflow is responsible for processing documents, extracting relevant information,
 * and updating the local MITRE ATT&CK database.
 */
export const documentWorkflow = {
    id: 'document-workflow',
    version: '1.0.0',
    description: 'Workflow for processing documents and updating MITRE ATT&CK database',
    steps: [
        {
            id: 'prepare-document',
            type: 'action',
            name: 'Prepare Document',
            params: {
                documentId: z.string(),
                userId: z.string()
            }
        },
        {
            id: 'get-mitre-data',
            type: 'action',
            name: 'Get MITRE Data',
            params: {
                techniqueIds: z.array(z.string()),
                version: z.string().optional()
            }
        },
        {
            id: 'evaluate-document',
            type: 'action',
            name: 'Evaluate Document',
            params: {
                documentId: z.string(),
                userId: z.string(),
                mitreData: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string(),
                    tactics: z.array(z.string()),
                    techniques: z.array(z.object({
                        id: z.string(),
                        name: z.string(),
                        score: z.number()
                    })),
                    keyFindings: z.array(z.string())
                })),
                detailedMatches: z.array(z.object({
                    techniqueId: z.string(),
                    techniqueName: z.string(),
                    confidenceScore: z.number(),
                    matchedText: z.string(),
                    context: z.string(),
                    textPosition: z.object({
                        startChar: z.number(),
                        endChar: z.number()
                    })
                })),
                mitreDatabaseVersion: z.string()
            }
        }
    ],
    dependencies: {
        'prepare-document': [],
        'get-mitre-data': [],
        'evaluate-document': ['prepare-document', 'get-mitre-data'],
        'generate-report': ['evaluate-document']
    }
};

/**
 * MITRE update workflow definition
 * Updates the local MITRE ATT&CK database
 */
export const mitreUpdateWorkflow = {
    id: 'mitre-update-workflow',
    version: '1.0.0',
    description: 'Workflow for updating the local MITRE ATT&CK database',
    steps: [
        {
            id: 'fetch-mitre-data',
            type: 'action',
            name: 'Fetch MITRE Data',
            params: {
                version: z.string().optional()
            }
        },
        {
            id: 'update-mitre-database',
            type: 'action',
            name: 'Update MITRE Database',
            params: {
                data: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string(),
                    tactics: z.array(z.string()),
                    techniques: z.array(z.object({
                        id: z.string(),
                        name: z.string(),
                        score: z.number()
                    })),
                    keyFindings: z.array(z.string())
                })),
                version: z.string()
            }
        }
    ],
    dependencies: {
        'fetch-mitre-data': [],
        'update-mitre-database': ['fetch-mitre-data']
    }
};