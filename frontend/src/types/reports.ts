// Pagination response
export interface PaginatedResponse<T> {
    success: boolean;
    data: {
        reports: T[];
        pagination: Pagination;
    };
    meta: {
        filters: any;
        timestamp: string;
    };
}

// Pagination interface
export interface Pagination {
    total: number;
    pages: number;
    current: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// Report filter options
export interface ReportFilters {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
    url?: string;
    minMatches?: number;
    techniques?: string[];
    tactics?: string[];
}

// Report summary
export interface ReportSummary {
    id: string;
    url: string | null;
    filename: string | null;
    timestamp: string;
    matchCount: number;
    topTechniques: TopTechnique[];
    highConfidenceCount: number;
}

// Top technique match
export interface TopTechnique {
    id: string;
    name: string;
    score: number;
}

// Report detail
export interface ReportDetail {
    id: string;
    timestamp: string;
    source: {
        url?: string;
        filename?: string;
        metadata: {
            size?: number;
            type?: string;
            pages?: number;
        };
    };
    summary: {
        matchCount: number;
        highConfidenceCount: number;
        tacticsBreakdown: Record<string, number>;
        topTechniques: TopTechnique[];
        keyFindings: string[];
    };
    detailedMatches: TechniqueMatch[];
    mitreDatabaseVersion: string;
}

// Technique match
export interface TechniqueMatch {
    techniqueId: string;
    techniqueName: string;
    confidenceScore: number;
    matchedText: string;
    context: string;
    textPosition: {
        startChar: number;
        endChar: number;
    };
}
