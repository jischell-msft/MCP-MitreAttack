import React, { useState, useEffect } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import { DateRangePicker, DateRange } from '../../components/ui/DateRangePicker/DateRangePicker';
import { Select, SelectOption } from '../../components/ui/Select/Select';
import { ReportFilters as FilterParams } from '../../types/reports';
import styles from './ReportFilters.module.scss';

interface ReportFiltersProps {
    filters: FilterParams;
    onChange: (newFilters: Partial<FilterParams>) => void;
}

const SORT_OPTIONS: SelectOption[] = [
    { value: 'timestamp', label: 'Date Analyzed' },
    { value: 'url', label: 'Source (URL/Filename)' },
    { value: 'matchCount', label: 'Number of Techniques' },
];

const SORT_ORDER_OPTIONS: SelectOption[] = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
];

const TACTICS_OPTIONS: SelectOption[] = [
    { value: 'reconnaissance', label: 'Reconnaissance' },
    { value: 'resource-development', label: 'Resource Development' },
    { value: 'initial-access', label: 'Initial Access' },
    { value: 'execution', label: 'Execution' },
    { value: 'persistence', label: 'Persistence' },
    { value: 'privilege-escalation', label: 'Privilege Escalation' },
    { value: 'defense-evasion', label: 'Defense Evasion' },
    { value: 'credential-access', label: 'Credential Access' },
    { value: 'discovery', label: 'Discovery' },
    { value: 'lateral-movement', label: 'Lateral Movement' },
    { value: 'collection', label: 'Collection' },
    { value: 'command-and-control', label: 'Command and Control' },
    { value: 'exfiltration', label: 'Exfiltration' },
    { value: 'impact', label: 'Impact' },
];

export const ReportFilters: React.FC<ReportFiltersProps> = ({
    filters,
    onChange,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [localFilters, setLocalFilters] = useState<FilterParams>(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleChange = (name: keyof FilterParams, value: any) => {
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDateRangeChange = (range: DateRange) => {
        handleChange('dateFrom', range.startDate);
        handleChange('dateTo', range.endDate);
    };

    const handleApplyFilters = () => {
        onChange(localFilters);
    };

    const handleResetFilters = () => {
        const defaultFilters: FilterParams = {
            page: 1,
            limit: filters.limit || 10,
            sortBy: 'timestamp',
            sortOrder: 'desc',
            url: undefined,
            dateFrom: undefined,
            dateTo: undefined,
            minMatches: undefined,
            tactics: undefined,
        };
        setLocalFilters(defaultFilters);
        onChange(defaultFilters);
    };

    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    return (
        <div className={styles.container} role="search" aria-labelledby="filter-heading">
            <h2 id="filter-heading" className={styles.srOnly}>Report Filters</h2>
            <div className={styles.basicFilters}>
                <div className={styles.searchContainer}>
                    <Input
                        placeholder="Search by URL or filename..."
                        value={localFilters.url || ''}
                        onChange={(e) => handleChange('url', e.target.value)}
                        leftIcon={<span>🔍</span>}
                        label="Search Source"
                        hideLabel
                        className={styles.searchInput}
                        aria-label="Search by source URL or filename"
                    />
                </div>

                <div className={styles.sortContainer}>
                    <Select
                        options={SORT_OPTIONS}
                        value={localFilters.sortBy}
                        onChange={(value) => handleChange('sortBy', value as string)}
                        label="Sort by"
                        className={styles.selectControl}
                        aria-label="Sort reports by"
                    />
                </div>

                <div className={styles.sortOrderContainer}>
                    <Select
                        options={SORT_ORDER_OPTIONS}
                        value={localFilters.sortOrder}
                        onChange={(value) => handleChange('sortOrder', value as 'asc' | 'desc')}
                        label="Order"
                        className={styles.selectControl}
                        aria-label="Sort order"
                    />
                </div>

                <div className={styles.actionsContainer}>
                    <Button
                        variant="outline"
                        onClick={toggleExpand}
                        aria-expanded={expanded}
                        aria-controls="advanced-filters-panel"
                    >
                        {expanded ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
                    </Button>

                    <Button
                        variant="primary"
                        onClick={handleApplyFilters}
                    >
                        Apply Filters
                    </Button>
                </div>
            </div>

            {expanded && (
                <div id="advanced-filters-panel" className={styles.advancedFilters} role="region">
                    <div className={styles.dateRangeContainer}>
                        <DateRangePicker
                            startDate={localFilters.dateFrom ? new Date(localFilters.dateFrom) : null}
                            endDate={localFilters.dateTo ? new Date(localFilters.dateTo) : null}
                            onDatesChange={handleDateRangeChange}
                            label="Filter by Date Range"
                        />
                    </div>

                    <div className={styles.minMatchesContainer}>
                        <Input
                            type="number"
                            label="Minimum Techniques Detected"
                            value={localFilters.minMatches === undefined ? '' : String(localFilters.minMatches)}
                            onChange={(e) => handleChange('minMatches', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                            min={0}
                            className={styles.numberInput}
                            aria-label="Minimum techniques detected"
                        />
                    </div>

                    <div className={styles.tacticsContainer}>
                        <Select
                            options={TACTICS_OPTIONS}
                            value={localFilters.tactics || []}
                            onChange={(value) => handleChange('tactics', value as string[])}
                            placeholder="Filter by Tactics (select multiple)"
                            label="Tactics"
                            multiple
                            isMulti
                            className={styles.multiSelectControl}
                            aria-label="Filter by MITRE ATT&CK Tactics"
                        />
                    </div>

                    <div className={styles.resetContainer}>
                        <Button
                            variant="text"
                            onClick={handleResetFilters}
                            className={styles.resetButton}
                        >
                            Reset All Filters
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
