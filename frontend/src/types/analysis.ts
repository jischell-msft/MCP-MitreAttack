// Analysis job status
export interface AnalysisJobStatus {
    jobId: string;
    status: 'submitted' | 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    currentStep: string | null;
    startTime: string;
    elapsedTimeMs: number;
    reportId?: string;
    reportUrl?: string;
    error?: {
        message: string;
        code: string;
    };
}

// Analysis job response
export interface AnalysisJob {
    success: boolean;
    data: {
        jobId: string;
        status: string;
        message: string;
        statusUrl: string;
    };
}

// Analysis options
export interface AnalysisOptions {
    minConfidence?: number;
    includeTactics?: string[];
    maxResults?: number;
    useAzureOpenAI?: boolean;
}
