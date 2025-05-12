export interface Match {
    id?: string;
    reportId: string;
    techniqueId: string;
    techniqueName: string;
    confidenceScore: number;
    contextText?: string;
    textPosition?: {
        startChar: number;
        endChar: number;
    };
}
