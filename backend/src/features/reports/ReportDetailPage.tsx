import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Tabs, Tab } from '../../components/ui/Tabs/Tabs';
import { ReportSummaryView } from './ReportSummaryView';
import { TechniqueMatchesList } from './TechniqueMatchesList';
import { TacticsHeatmap } from './TacticsHeatmap';
import { ExportReportModal } from './ExportReportModal';
import { ReportsService } from '../../services/api/reports-service';
import { formatDate } from '../../utils/date-utils';
import styles from './ReportDetailPage.module.scss';

// Placeholder for ReportDetail type, adjust as per actual API response
interface ReportDetail {
    id: string;
    source: {
        url?: string;
        filename?: string;
    };
    timestamp: string;
    mitreDatabaseVersion: string;
    summary: {
        matchCount: number;
        highConfidenceCount: number;
        tacticsBreakdown: Record<string, number>;
        // Potentially other summary fields
    };
    detailedMatches: TechniqueMatch[]; // Using TechniqueMatch from TechniqueMatchesList
    // other fields
}

// TechniqueMatch interface (can be imported from a shared types file)
interface TechniqueMatch {
    techniqueId: string;
    techniqueName: string;
    confidenceScore: number;
    matchedText: string;
    context: string;
    textPosition?: {
        startChar: number;
        endChar: number;
    };
    tactics?: string[]; // Added for TacticsHeatmap if needed
}

export const ReportDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient(); // For invalidating queries on mutation
    const [activeTab, setActiveTab] = useState<'summary' | 'techniques' | 'heatmap'>('summary');
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Fetch report details with React Query
    const {
        data: report,
        isLoading,
        isError,
        error
    } = useQuery<ReportDetail, Error>({
        queryKey: ['report', id],
        queryFn: () => id ? ReportsService.getReportById(id) : Promise.reject(new Error('No report ID provided')),
        enabled: !!id,
    });

    const deleteMutation = useMutation<void, Error, string>({
        mutationFn: (reportId: string) => ReportsService.deleteReport(reportId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] }); // Invalidate list of reports
            navigate('/reports');
        },
        onError: (err) => {
            console.error('Error deleting report:', err);
            alert('Failed to delete report: ' + (err.message || 'Unknown error'));
        }
    });

    const handleExport = () => {
        setExportModalOpen(true);
    };

    const handleDelete = async () => {
        if (!id) return;
        if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingSpinner size="large" label="Loading report details..." />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={styles.errorContainer}>
                <Card>
                    <EmptyState
                        title="Error Loading Report"
                        description={error?.message || 'An error occurred while loading the report details.'}
                        icon={<span>💔</span>}
                        action={
                            <div className={styles.errorActions}>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/reports')}
                                >
                                    Back to Reports List
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => queryClient.refetchQueries({ queryKey: ['report', id] })}
                                >
                                    Retry
                                </Button>
                            </div>
                        }
                    />
                </Card>
            </div>
        );
    }

    if (!report) {
        return (
            <div className={styles.errorContainer}>
                <Card>
                    <EmptyState
                        title="Report Not Found"
                        description="The requested report could not be found or may have been deleted."
                        icon={<span>🤷</span>}
                        action={
                            <Button
                                variant="primary"
                                onClick={() => navigate('/reports')}
                            >
                                Back to Reports List
                            </Button>
                        }
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.breadcrumbs}>
                    <Link to="/reports" className={styles.breadcrumbLink}>Reports</Link>
                    <span className={styles.breadcrumbSeparator}>/</span>
                    <span className={styles.breadcrumbCurrent}>Report Details</span>
                </div>

                <div className={styles.actions}>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                    >
                        Export Report
                    </Button>
                    <Button
                        variant="danger" // Changed to danger for delete
                        onClick={handleDelete}
                        className={styles.deleteButton}
                        loading={deleteMutation.isLoading}
                    >
                        Delete Report
                    </Button>
                </div>
            </div>

            <Card className={styles.reportHeaderCard}>
                <div className={styles.sourceInfo}>
                    <h1 className={styles.title}>
                        {report.source.url ? (
                            <div className={styles.urlSource}>
                                <span className={styles.urlIcon}>🔗</span>
                                <a href={report.source.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                                    {report.source.url}
                                </a>
                            </div>
                        ) : report.source.filename ? (
                            <div className={styles.fileSource}>
                                <span className={styles.fileIcon}>📄</span>
                                <span className={styles.sourceText}>{report.source.filename}</span>
                            </div>
                        ) : (
                            'Unknown Source'
                        )}
                    </h1>

                    <div className={styles.metadata}>
                        <div className={styles.metadataItem}>
                            <span className={styles.metadataLabel}>Analyzed:</span>
                            <span className={styles.metadataValue}>{formatDate(report.timestamp)}</span>
                        </div>

                        <div className={styles.metadataItem}>
                            <span className={styles.metadataLabel}>MITRE ATT&CK Version:</span>
                            <span className={styles.metadataValue}>{report.mitreDatabaseVersion}</span>
                        </div>

                        <div className={styles.metadataItem}>
                            <span className={styles.metadataLabel}>Techniques Detected:</span>
                            <span className={styles.metadataValue}>
                                {report.summary.matchCount}
                                {report.summary.highConfidenceCount > 0 && (
                                    <span className={styles.highConfidenceText}>
                                        ({report.summary.highConfidenceCount} high confidence)
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className={styles.contentCard}>
                <Tabs
                    activeTab={activeTab}
                    onChange={(tabId) => setActiveTab(tabId as 'summary' | 'techniques' | 'heatmap')}
                >
                    <Tab id="summary" label="Summary">
                        <ReportSummaryView summary={report.summary} />
                    </Tab>

                    <Tab id="techniques" label={`Technique Matches (${report.detailedMatches.length})`}>
                        <TechniqueMatchesList matches={report.detailedMatches} />
                    </Tab>

                    <Tab id="heatmap" label="Tactics Heatmap">
                        <TacticsHeatmap
                            tacticsBreakdown={report.summary.tacticsBreakdown}
                            techniques={report.detailedMatches}
                        />
                    </Tab>
                </Tabs>
            </Card>

            {id && (
                <ExportReportModal
                    isOpen={exportModalOpen}
                    onClose={() => setExportModalOpen(false)}
                    reportId={id}
                />
            )}
        </div>
    );
};
