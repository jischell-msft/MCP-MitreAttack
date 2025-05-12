// System status
export interface SystemStatus {
    system: {
        status: string;
        uptime: number;
        version: string;
        nodeVersion: string;
    };
    components: {
        database: ComponentStatus;
        mitreData: MitreDataStatus;
        diskSpace: DiskSpaceStatus;
        queue: QueueStatus;
    };
}

// Component status
interface ComponentStatus {
    status: 'operational' | 'warning' | 'error';
    message?: string;
    [key: string]: any;
}

// MITRE data status
interface MitreDataStatus extends ComponentStatus {
    version?: string;
    techniqueCount?: number;
    lastUpdated?: string;
    nextUpdate?: string;
}

// Disk space status
interface DiskSpaceStatus extends ComponentStatus {
    total?: number;
    free?: number;
    used?: number;
    percentUsed?: number;
}

// Queue status
interface QueueStatus extends ComponentStatus {
    pendingJobs?: number;
    runningJobs?: number;
    completedJobs?: number;
    failedJobs?: number;
}

// Update job status
export interface UpdateJobStatus {
    jobId: string;
    status: 'submitted' | 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message?: string;
    error?: {
        message: string;
        code: string;
    };
}
