import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card/Card';
import { Table, TableColumn } from '../../components/ui/Table/Table';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
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
    } = useQuery({
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
        // Reset to page 1 when filters change
        setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
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
            sortable: true,
            className: styles.dateColumn,
        },
        {
            header: 'Techniques',
            accessor: (row) => (
                <div className={styles.matchCountCell}>
                    <span className={styles.matchCount}>{row.matchCount}</span>
                    <span className={styles.highConfidenceCount}>
                        ({row.highConfidenceCount} high confidence)
                    </span>
                </div>
            ),
            width: '20%',
            sortable: true,
            className: styles.matchCountColumn,
        },
        {
            header: 'Top Techniques',
            accessor: (row) => (
                <div className={styles.topTechniquesCell}>
                    {row.topTechniques.map((technique, index) => (
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
                            e.stopPropagation();
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
            <div className={styles.header}>
                <h1 className={styles.title}>Analysis Reports</h1>
                <Button
                    variant="primary"
                    onClick={() => navigate('/analyze')}
                >
                    New Analysis
                </Button>
            </div>

            <Card className={styles.filtersCard}>
                <ReportFilters
                    filters={filters}
                    onChange={handleFilterChange}
                />
            </Card>

            <Card className={styles.tableCard}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <LoadingSpinner size="large" label="Loading reports..." />
                    </div>
                ) : isError ? (
                    <div className={styles.error}>
                        <EmptyState
                            title="Error Loading Reports"
                            description={error.message || 'An error occurred while loading reports'}
                            action={
                                <Button
                                    variant="primary"
                                    onClick={() => window.location.reload()}
                                >
                                    Retry
                                </Button>
                            }
                        />
                    </div>
                ) : data?.reports.length === 0 ? (
                    <EmptyState
                        title="No Reports Found"
                        description="No analysis reports match your filters"
                        action={
                            <Button
                                variant="primary"
                                onClick={() => setFilters({
                                    page: 1,
                                    limit: 10,
                                    sortBy: 'timestamp',
                                    sortOrder: 'desc',
                                })}
                            >
                                Clear Filters
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <Table<ReportSummary>
                            data={data?.reports || []}
                            columns={columns}
                            onRowClick={handleRowClick}
                            keyExtractor={(row) => row.id}
                            emptyMessage="No reports found"
                        />

                        {data?.pagination && (
                            <div className={styles.pagination}>
                                <Pagination
                                    currentPage={data.pagination.current}
                                    totalPages={data.pagination.pages}
                                    onPageChange={handlePageChange}
                                    disabled={isLoading}
                                />

                                <div className={styles.paginationInfo}>
                                    Showing {(data.pagination.current - 1) * filters.limit + 1} to{' '}
                                    {Math.min(
                                        data.pagination.current * filters.limit,
                                        data.pagination.total
                                    )}{' '}
                                    of {data.pagination.total} reports
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};
