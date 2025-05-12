import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card/Card';
import { Table, TableColumn } from '../../components/ui/Table/Table';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { Button } from '../../components/ui/Button/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { ReportFilters } from './ReportFilters';
import { ReportsService } from '../../services/api/reports-service';
import { formatDistanceToNow } from 'date-fns';
import { ReportSummary, ReportFilters as FilterParams } from '../../types/reports';
import styles from './ReportsListPage.module.scss';

export const ReportsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<FilterParams>({
        page: 1,
        limit: 10,
        sortBy: 'timestamp',
        sortOrder: 'desc',
    });

    // Fetch reports with React Query
    const {
        data,
        isLoading,
        isError,
        error
    } = useQuery<{ reports: ReportSummary[]; totalPages: number; totalRecords: number }, Error>({
        queryKey: ['reports', filters],
        queryFn: () => ReportsService.getReports(filters),
        keepPreviousData: true, // Keep old data while fetching new data
    });

    const handleRowClick = (report: ReportSummary) => {
        navigate(`/reports/${report.id}`);
    };

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }));
    };

    const handleFilterChange = (newFilters: Partial<FilterParams>) => {
        // Reset to page 1 when filters change, unless page is explicitly set in newFilters
        setFilters(prev => ({ ...prev, ...newFilters, page: newFilters.page || 1 }));
    };

    // Table column definitions
    const columns: TableColumn<ReportSummary>[] = [
        {
            header: 'Source',
            accessor: (row) => {
                if (row.url) {
                    return (
                        <div className={styles.sourceCell}>
                            <span className={styles.urlIcon}>🔗</span>
                            <span className={styles.sourceText}>{row.url}</span>
                        </div>
                    );
                } else if (row.filename) {
                    return (
                        <div className={styles.sourceCell}>
                            <span className={styles.fileIcon}>📄</span>
                            <span className={styles.sourceText}>{row.filename}</span>
                        </div>
                    );
                }
                return 'Unknown source';
            },
            width: '40%',
            className: styles.sourceColumn,
        },
        {
            header: 'Date',
            accessor: (row) => formatDistanceToNow(new Date(row.timestamp), { addSuffix: true }),
            width: '15%',
            sortable: true, // Assuming Table component handles this
            className: styles.dateColumn,
        },
        {
            header: 'Techniques',
            accessor: (row) => (
                <div className={styles.matchCountCell}>
                    <span className={styles.matchCount}>{row.matchCount}</span>
                    {row.highConfidenceCount > 0 && (
                        <span className={styles.highConfidenceCount}>
                            ({row.highConfidenceCount} high confidence)
                        </span>
                    )}
                </div>
            ),
            width: '20%',
            sortable: true, // Assuming Table component handles this
            className: styles.matchCountColumn,
        },
        {
            header: 'Top Techniques',
            accessor: (row) => (
                <div className={styles.topTechniquesCell}>
                    {row.topTechniques && row.topTechniques.slice(0, 3).map((technique) => ( // Display max 3
                        <span key={technique.id} className={styles.techniqueBadge}>
                            {technique.id}
                        </span>
                    ))}
                </div>
            ),
            width: '20%',
            className: styles.topTechniquesColumn,
        },
        {
            header: 'Actions',
            accessor: (row) => (
                <div className={styles.actionsCell}>
                    <Button
                        variant="outline"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row click if button is clicked
                            navigate(`/reports/${row.id}`);
                        }}
                    >
                        View
                    </Button>
                </div>
            ),
            width: '5%',
            className: styles.actionsColumn,
        },
    ];

    return (
        <div className={styles.container}>
            <Card className={styles.filterCard} elevation={1}>
                <ReportFilters filters={filters} onChange={handleFilterChange} />
            </Card>

            <Card className={styles.resultsCard} elevation={1}>
                {isLoading && (
                    <div className={styles.loadingContainer}>
                        <LoadingSpinner size="large" label="Loading reports..." />
                    </div>
                )}
                {isError && error && (
                    <EmptyState
                        title="Error Loading Reports"
                        description={error.message || 'An unexpected error occurred while fetching reports.'}
                        icon={<span>⚠️</span>} // Example icon
                    />
                )}
                {!isLoading && !isError && (!data || data.reports.length === 0) && (
                    <EmptyState
                        title="No Reports Found"
                        description="No reports match your current filter criteria. Try adjusting your filters."
                        icon={<span>📂</span>} // Example icon
                    />
                )}
                {!isLoading && !isError && data && data.reports.length > 0 && (
                    <>
                        <Table
                            columns={columns}
                            data={data.reports}
                            onRowClick={handleRowClick}
                            className={styles.reportsTable}
                        // Add other table props like sort state if managed here
                        />
                        {data.totalPages > 1 && (
                            <Pagination
                                currentPage={filters.page}
                                totalPages={data.totalPages}
                                onPageChange={handlePageChange}
                                className={styles.pagination}
                            />
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};
