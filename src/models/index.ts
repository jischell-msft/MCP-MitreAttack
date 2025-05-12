/**
 * Data Models
 * 
 * This directory will contain TypeScript interfaces and types for:
 * - MITRE ATT&CK techniques and tactics
 * - Analysis results and matches
 * - Reports and summaries
 * - Workflow definitions and state
 */

// Example base interfaces
export interface BaseModel {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Report extends BaseModel {
    source: {
        url?: string;
        filename?: string;
        metadata: Record<string, unknown>;
    };
    summary: {
        matchCount: number;
        highConfidenceCount: number;
        tacticsBreakdown: Record<string, number>;
        topTechniques: Array<{
            id: string;
            name: string;
            score: number;
        }>;
        keyFindings: string[];
    };
    // Will include more fields as needed
}
