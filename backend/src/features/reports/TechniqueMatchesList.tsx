import React, { useState, useMemo } from 'react'; // Added useMemo
import { Input } from '../../components/ui/Input/Input';
import { Select, SelectOption } from '../../components/ui/Select/Select'; // Added SelectOption
import { TechniqueMatchCard } from './TechniqueMatchCard';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import styles from './TechniqueMatchesList.module.scss';

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
    // tactics?: string[]; // If needed by other components like TacticsHeatmap
}

interface TechniqueMatchesListProps {
    matches: TechniqueMatch[];
}

type SortByType = 'confidence' | 'id' | 'name'; // Added 'name' for sorting

export const TechniqueMatchesList: React.FC<TechniqueMatchesListProps> = ({ matches }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [confidenceFilter, setConfidenceFilter] = useState<string>('all'); // e.g., 'all', 'high', 'medium', 'low'
    const [sortBy, setSortBy] = useState<SortByType>('confidence');

    const filteredAndSortedMatches = useMemo(() => {
        return matches
            .filter((match) => {
                // Apply search filter
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                        match.techniqueId.toLowerCase().includes(searchLower) ||
                        match.techniqueName.toLowerCase().includes(searchLower) ||
                        match.matchedText.toLowerCase().includes(searchLower) ||
                        match.context.toLowerCase().includes(searchLower) // Search in context as well
                    );
                }
                return true;
            })
            .filter((match) => {
                // Apply confidence filter
                if (confidenceFilter === 'high') {
                    return match.confidenceScore >= 85;
                } else if (confidenceFilter === 'medium') {
                    return match.confidenceScore >= 60 && match.confidenceScore < 85;
                } else if (confidenceFilter === 'low') {
                    return match.confidenceScore < 60;
                }
                return true; // 'all'
            })
            .sort((a, b) => {
                // Apply sorting
                if (sortBy === 'confidence') {
                    return b.confidenceScore - a.confidenceScore;
                } else if (sortBy === 'id') {
                    return a.techniqueId.localeCompare(b.techniqueId);
                } else if (sortBy === 'name') {
                    return a.techniqueName.localeCompare(b.techniqueName);
                }
                return 0;
            });
    }, [matches, searchTerm, confidenceFilter, sortBy]);

    const confidenceOptions: SelectOption[] = [
        { value: 'all', label: 'All Confidences' },
        { value: 'high', label: 'High Confidence (85+)' },
        { value: 'medium', label: 'Medium Confidence (60-84)' },
        { value: 'low', label: 'Low Confidence (<60)' },
    ];

    const sortOptions: SelectOption[] = [
        { value: 'confidence', label: 'Sort by Confidence' },
        { value: 'id', label: 'Sort by Technique ID' },
        { value: 'name', label: 'Sort by Technique Name' },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.searchContainer}>
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search techniques (ID, name, text, context)"
                        leftIcon={<span>🔍</span>} // Consider using an SVG icon component
                        className={styles.searchInput}
                        aria-label="Search techniques"
                    />
                </div>

                <div className={styles.filterContainer}>
                    <Select
                        options={confidenceOptions}
                        value={confidenceFilter}
                        onChange={(value) => setConfidenceFilter(value as string)}
                        placeholder="Filter by confidence"
                        label="Confidence Filter"
                        className={styles.selectControl}
                        aria-label="Filter by confidence"
                    />
                </div>

                <div className={styles.sortContainer}>
                    <Select
                        options={sortOptions}
                        value={sortBy}
                        onChange={(value) => setSortBy(value as SortByType)}
                        placeholder="Sort by"
                        label="Sort By"
                        className={styles.selectControl}
                        aria-label="Sort by"
                    />
                </div>
            </div>

            <div className={styles.matchesList}>
                {filteredAndSortedMatches.length === 0 ? (
                    <EmptyState
                        title="No Matching Techniques"
                        description={
                            searchTerm || confidenceFilter !== 'all'
                                ? "No techniques match your current filters. Try adjusting your search or filter options."
                                : "No techniques were detected in this document, or they have all been filtered out."
                        }
                        icon={<span>🧐</span>} // Example icon
                    />
                ) : (
                    filteredAndSortedMatches.map((match, index) => ( // Added index for rare cases where key might not be unique enough
                        <TechniqueMatchCard
                            key={`${match.techniqueId}-${match.textPosition?.startChar || index}`}
                            match={match}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
