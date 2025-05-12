import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

export const ReportDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'summary' | 'techniques' | 'heatmap'>('summary');
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Fetch report details with React Query
    const {
        data: report,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['report', id],
        queryFn: () => id ? ReportsService.getReportById(id) : Promise.reject('No report ID provided'),
        enabled: !!id,
    });

    const handleExport = () => {
        setExportModalOpen(true);
    };

    const handleDelete = async () => {
        if (!id || !window.confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            await ReportsService.deleteReport(id);
            navigate('/reports');
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report: ' + (error.message || 'Unknown error'));
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingSpinner size="large" label="Loading report..." />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={styles.errorContainer}>
                <Card>
                    <EmptyState
                        title="Error Loading Report"
                        description={error.message || 'An error occurred while loading the report'}
                        action={
                            <div className={styles.errorActions}>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/reports')}
                                >
                                    Back to Reports
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => window.location.reload()}
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
                        description="The requested report could not be found"
                        action={
                            <Button
                                variant="primary"
                                onClick={() => navigate('/reports')}
                            >
                                Back to Reports
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
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDelete}
                        className={styles.deleteButton}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            <Card className={styles.reportHeader}>
                <div className={styles.sourceInfo}>
                    <h1 className={styles.title}>
                        {report.source.url ? (
                            <div className={styles.urlSource}>
                                <span className={styles.urlIcon}>🔗</span>
                                <span className={styles.sourceText}>{report.source.url}</span>
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
                                <span className={styles.highConfidenceText}>
                                    ({report.summary.highConfidenceCount} high confidence)
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className={styles.contentCard}>
                <Tabs
                    activeTab={activeTab}
                    onChange={(tab) => setActiveTab(tab as any)}
                >
                    <Tab id="summary" label="Summary">
                        <ReportSummaryView summary={report.summary} />
                    </Tab>

                    <Tab id="techniques" label="Technique Matches">
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

            <ExportReportModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                reportId={id!}
            />
        </div>
    );
};
