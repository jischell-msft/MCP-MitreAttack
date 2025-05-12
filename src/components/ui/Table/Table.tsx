import React, { useState, ReactNode } from 'react';
import styles from './Table.module.scss';

export interface TableColumn<T> {
    header: string;
    accessor: keyof T | ((row: T) => ReactNode);
    width?: string;
    className?: string;
    sortable?: boolean;
}

export interface TableProps<T> {
    data: T[];
    columns: TableColumn<T>[];
    emptyMessage?: string;
    className?: string;
    onRowClick?: (row: T) => void;
    onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
    loading?: boolean;
    keyExtractor: (row: T) => string;
}

export function Table<T>({
    data,
    columns,
    emptyMessage = 'No data available',
    className,
    onRowClick,
    onSort,
    loading = false,
    keyExtractor,
}: TableProps<T>): JSX.Element {
    const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: TableColumn<T>) => {
        if (!column.sortable || typeof column.accessor !== 'string') return;

        const accessor = column.accessor as keyof T;

        if (sortColumn === accessor) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            setSortDirection(newDirection);
            onSort?.(accessor, newDirection);
        } else {
            setSortColumn(accessor);
            setSortDirection('asc');
            onSort?.(accessor, 'asc');
        }
    };

    const renderCell = (row: T, column: TableColumn<T>): ReactNode => {
        if (typeof column.accessor === 'function') {
            return column.accessor(row);
        }

        return row[column.accessor] as ReactNode;
    };

    const containerClasses = [
        styles.container,
        loading ? styles.loading : '',
        className || '',
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            {loading && <div className={styles.loadingOverlay}>Loading...</div>}

            <table className={styles.table}>
                <thead className={styles.header}>
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className={`${styles.headerCell} ${column.className || ''} ${column.sortable ? styles.sortable : ''}`}
                                style={{ width: column.width }}
                                onClick={() => column.sortable && handleSort(column)}
                            >
                                <div className={styles.headerContent}>
                                    {column.header}

                                    {column.sortable && typeof column.accessor === 'string' && sortColumn === column.accessor && (
                                        <span className={styles.sortIcon}>
                                            {sortDirection === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className={styles.body}>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className={styles.emptyMessage}>
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={keyExtractor(row)}
                                className={`${styles.row} ${onRowClick ? styles.clickable : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((column, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className={`${styles.cell} ${column.className || ''}`}
                                    >
                                        {renderCell(row, column)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
