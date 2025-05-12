import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import styles from './RecentSubmissions.module.scss';

interface Submission {
    id: string;
    type: 'url' | 'file';
    url?: string;
    filename?: string;
    timestamp: Date;
    reportId?: string;
    status: 'completed' | 'failed' | 'processing' | 'pending';
}

export const RecentSubmissions: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Load recent submissions from local storage
        const loadSubmissions = () => {
            const stored = localStorage.getItem('recentSubmissions');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    // Convert string timestamps back to Date objects
                    const submissions = parsed.map((sub: any) => ({
                        ...sub,
                        timestamp: new Date(sub.timestamp)
                    }));
                    setSubmissions(submissions);
                } catch (error) {
                    console.error('Error loading recent submissions:', error);
                    // If there's an error, clear the corrupted data
                    localStorage.removeItem('recentSubmissions');
                }
            }
        };

        loadSubmissions();
    }, []);

    const saveSubmissions = (subs: Submission[]) => {
        try {
            localStorage.setItem('recentSubmissions', JSON.stringify(subs));
        } catch (error) {
            console.error('Error saving recent submissions:', error);
        }
    };

    const addSubmission = (submission: Submission) => {
        const updatedSubmissions = [
            submission,
            ...submissions.filter(sub =>
                !(sub.type === submission.type &&
                    (sub.url === submission.url || sub.filename === submission.filename))
            )
        ].slice(0, 10); // Keep only the 10 most recent

        setSubmissions(updatedSubmissions);
        saveSubmissions(updatedSubmissions);
    };

    const clearSubmissions = () => {
        setSubmissions([]);
        localStorage.removeItem('recentSubmissions');
    };

    const handleViewReport = (reportId: string) => {
        navigate(`/reports/${reportId}`);
    };

    const handleResubmit = (submission: Submission) => {
        // Implementation would connect back to the parent component
        // This would typically dispatch an event or use a callback
        console.log('Resubmit requested for:', submission);
    };

    if (submissions.length === 0) {
        return (
            <Card className={styles.container}>
                <EmptyState
                    title="No Recent Submissions"
                    description="Your recent document submissions will appear here"
                    icon={
                        <svg width="48" height="48" viewBox="0 0 24 24">
                            <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.52 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-8.9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-4.95.5-8.9 4.77-8.9 9.95 0 5.52 4.47 10 9.9 10 3.03 0 5.8-1.38 7.66-3.55l-2.52-1.53C16.12 18.24 14.18 19 12 19z" />
                        </svg>
                    }
                />
            </Card>
        );
    }

    return (
        <Card className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Recent Submissions</h3>
                <Button
                    variant="text"
                    size="small"
                    onClick={clearSubmissions}
                >
                    Clear History
                </Button>
            </div>

            <div className={styles.list}>
                {submissions.map((submission) => (
                    <div key={submission.id} className={styles.item}>
                        <div className={styles.icon}>
                            {submission.type === 'url' ? (
                                <span className={styles.urlIcon}>🔗</span>
                            ) : (
                                <span className={styles.fileIcon}>📄</span>
                            )}
                        </div>

                        <div className={styles.details}>
                            <div className={styles.name}>
                                {submission.type === 'url'
                                    ? submission.url
                                    : submission.filename}
                            </div>

                            <div className={styles.meta}>
                                <span className={styles.time}>
                                    {formatDistanceToNow(submission.timestamp, { addSuffix: true })}
                                </span>

                                <span className={`${styles.status} ${styles[submission.status]}`}>
                                    {submission.status}
                                </span>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            {submission.reportId && submission.status === 'completed' ? (
                                <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleViewReport(submission.reportId!)}
                                >
                                    View
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleResubmit(submission)}
                                    disabled={submission.status === 'processing'}
                                >
                                    Resubmit
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};
