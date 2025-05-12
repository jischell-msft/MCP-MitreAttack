import React, { useEffect, useState } from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import styles from './JobStatusIndicator.module.scss';

interface JobStatusIndicatorProps {
    jobId: string;
    onCancel?: () => void;
    onComplete?: (reportId: string) => void;
    autoRefresh?: boolean;
}

export const JobStatusIndicator: React.FC<JobStatusIndicatorProps> = ({
    jobId,
    onCancel,
    onComplete,
    autoRefresh = true,
}) => {
    const [status, setStatus] = useState<any>({
        status: 'pending',
        progress: 0,
        currentStep: null,
        elapsedTimeMs: 0,
        reportId: null,
        error: null
    });
    const [intervalId, setIntervalId] = useState<number | null>(null);

    useEffect(() => {
        // Initial fetch
        fetchStatus();

        // Set up interval for polling if autoRefresh is enabled
        if (autoRefresh) {
            const id = window.setInterval(fetchStatus, 2000);
            setIntervalId(id);

            // Clean up on unmount
            return () => {
                window.clearInterval(id);
            };
        }
    }, [jobId, autoRefresh]);

    const fetchStatus = async () => {
        try {
            const response = await fetch(`/api/analyze/${jobId}`);
            const data = await response.json();

            if (data.success) {
                setStatus(data.data);

                // Check if job is completed or failed
                if (data.data.status === 'completed' || data.data.status === 'failed') {
                    // Stop polling
                    if (intervalId) {
                        window.clearInterval(intervalId);
                        setIntervalId(null);
                    }

                    // Call onComplete callback if job completed successfully
                    if (data.data.status === 'completed' && data.data.reportId && onComplete) {
                        onComplete(data.data.reportId);
                    }
                }
            } else {
                // Handle API error
                console.error('Error fetching job status:', data.error);
                if (intervalId) {
                    window.clearInterval(intervalId);
                    setIntervalId(null);
                }
            }
        } catch (error) {
            console.error('Error fetching job status:', error);
        }
    };

    const handleCancel = () => {
        // Stop polling
        if (intervalId) {
            window.clearInterval(intervalId);
            setIntervalId(null);
        }

        // Call onCancel callback
        if (onCancel) {
            onCancel();
        }
    };

    const getStatusText = () => {
        switch (status.status) {
            case 'pending':
                return 'Waiting to start...';
            case 'running':
                return status.currentStep
                    ? `Processing: ${formatStepName(status.currentStep)}`
                    : 'Processing...';
            case 'completed':
                return 'Analysis completed successfully!';
            case 'failed':
                return `Analysis failed: ${status.error?.message || 'Unknown error'}`;
            default:
                return 'Unknown status';
        }
    };

    const formatStepName = (step: string) => {
        // Convert camelCase or kebab-case to readable text
        return step
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/-/g, ' ') // Replace hyphens with spaces
            .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    };

    const formatElapsedTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <Card className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Analysis Status</h3>
                <div className={styles.jobId}>Job ID: {jobId}</div>
            </div>

            <div className={styles.status}>
                <div className={styles.statusText}>{getStatusText()}</div>

                <ProgressBar
                    progress={status.progress}
                    status={status.status}
                />

                <div className={styles.details}>
                    <div className={styles.elapsed}>
                        Time elapsed: {formatElapsedTime(status.elapsedTimeMs)}
                    </div>

                    {status.status === 'failed' && status.error && (
                        <div className={styles.error}>
                            {status.error.message}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.actions}>
                {status.status === 'pending' || status.status === 'running' ? (
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                ) : status.status === 'completed' && status.reportId ? (
                    <Button
                        variant="primary"
                        onClick={() => onComplete?.(status.reportId)}
                    >
                        View Report
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        onClick={() => fetchStatus()}
                    >
                        Refresh Status
                    </Button>
                )}
            </div>
        </Card>
    );
};
