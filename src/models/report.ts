import { Match } from './match';

export interface Report {
    id: string;
    workflowId: string;
    url?: string;
    createdAt: Date;
    mitreVersion: string;
    summary: ReportSummary;
    matches?: Match[];
}

export interface ReportSummary {
    matchCount: number;
    highConfidenceCount: number;
    tacticsBreakdown: Record<string, number>;
    topTechniques: Array<{
        id: string;
        name: string;
        score: number;
    }>;
    keyFindings: string[];
}
