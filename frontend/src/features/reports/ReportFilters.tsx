import React, { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import { DateRangePicker } from '../../components/ui/DateRangePicker/DateRangePicker';
import { Select } from '../../components/ui/Select/Select';
import { ReportFilters as FilterParams } from '../../types/reports';
import styles from './ReportFilters.module.scss';

interface ReportFiltersProps {
    filters: FilterParams;
    onChange: (filters: Partial<FilterParams>) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
    filters,
    onChange,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [localFilters, setLocalFilters] = useState<FilterParams>(filters);

    const handleChange = (name: keyof FilterParams, value: any) => {
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        onChange(localFilters);
    };

    const handleResetFilters = () => {
        const resetFilters = {
            page: 1,
            limit: filters.limit,
            sortBy: 'timestamp',
            sortOrder: 'desc',
            url: undefined,
            dateFrom: undefined,
            dateTo: undefined,
            minMatches: undefined,
            techniques: undefined,
            tactics: undefined,
        };

        setLocalFilters(resetFilters);
        onChange(resetFilters);
    };

    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    const sortOptions = [
        { value: 'timestamp', label: 'Date' },
        { value: 'url', label: 'Source' },
        { value: 'matchCount', label: 'Number of Techniques' },
    ];

    const sortOrderOptions = [
        { value: 'desc', label: 'Descending' },
        { value: 'asc', label: 'Ascending' },
    ];

    const tacticsOptions = [
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

    return (
        <div className={styles.container}>
            <div className={styles.basicFilters}>
                <div className={styles.searchContainer}>
                    <Input
                        placeholder="Search by URL or filename"
                        value={localFilters.url || ''}
                        onChange={(e) => handleChange('url', e.target.value)}
                        leftIcon={<span>🔍</span>}
                    />
                </div>

                <div className={styles.sortContainer}>
                    <Select
                        options={sortOptions}
                        value={localFilters.sortBy}
                        onChange={(value) => handleChange('sortBy', value)}
                        placeholder="Sort by"
                        label="Sort by"
                    />
                </div>

                <div className={styles.sortOrderContainer}>
                    <Select
                        options={sortOrderOptions}
                        value={localFilters.sortOrder}
                        onChange={(value) => handleChange('sortOrder', value)}
                        placeholder="Order"
                        label="Order"
                    />
                </div>

                <div className={styles.actionsContainer}>
                    <Button
                        variant="outline"
                        onClick={toggleExpand}
                    >
                        {expanded ? 'Hide Filters' : 'More Filters'}
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
                <div className={styles.advancedFilters}>
                    <div className={styles.dateRangeContainer}>
                        <DateRangePicker
                            startDate={localFilters.dateFrom}
                            endDate={localFilters.dateTo}
                            onDatesChange={({ startDate, endDate }) => {
                                handleChange('dateFrom', startDate);
                                handleChange('dateTo', endDate);
                            }}
                            label="Date Range"
                        />
                    </div>

                    <div className={styles.minMatchesContainer}>
                        <Input
                            type="number"
                            label="Minimum Techniques"
                            value={localFilters.minMatches || ''}
                            onChange={(e) => handleChange('minMatches', parseInt(e.target.value) || undefined)}
                            min={0}
                        />
                    </div>

                    <div className={styles.tacticsContainer}>
                        <Select
                            options={tacticsOptions}
                            value={localFilters.tactics || []}
                            onChange={(value) => handleChange('tactics', value)}
                            placeholder="Select Tactics"
                            label="Tactics"
                            multiple
                        />
                    </div>

                    <div className={styles.resetContainer}>
                        <Button
                            variant="text"
                            onClick={handleResetFilters}
                        >
                            Reset Filters
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
