export type WorkflowType = 'analysis' | 'refresh' | 'reeval';
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Workflow {
    id: string;
    type: WorkflowType;
    status: WorkflowStatus;
    createdAt: Date;
    updatedAt: Date;
    sourceUrl?: string;
    documentId?: string;
    currentStep?: string;
    error?: string;
    completionTime?: number;
}

export interface TaskResult {
    id: string;
    workflowId: string;
    taskName: string;
    status: 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    resultData?: any;
    error?: string;
}
