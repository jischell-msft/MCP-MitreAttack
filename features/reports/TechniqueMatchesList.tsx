import React, { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { TechniqueMatchCard } from './TechniqueMatchCard';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import styles from './TechniqueMatchesList.module.scss';

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
}

interface TechniqueMatchesListProps {
    matches: TechniqueMatch[];
}

export const TechniqueMatchesList: React.FC<TechniqueMatchesListProps> = ({ matches }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'confidence' | 'id'>('confidence');

    // Filter and sort matches
    const filteredMatches = matches
        .filter((match) => {
            // Apply search filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return (
                    match.techniqueId.toLowerCase().includes(searchLower) ||
                    match.techniqueName.toLowerCase().includes(searchLower) ||
                    match.matchedText.toLowerCase().includes(searchLower)
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
            } else {
                return a.techniqueId.localeCompare(b.techniqueId);
            }
        });

    const confidenceOptions = [
        { value: 'all', label: 'All Confidences' },
        { value: 'high', label: 'High Confidence (85+)' },
        { value: 'medium', label: 'Medium Confidence (60-84)' },
        { value: 'low', label: 'Low Confidence (<60)' },
    ];

    const sortOptions = [
        { value: 'confidence', label: 'Sort by Confidence' },
        { value: 'id', label: 'Sort by Technique ID' },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.searchContainer}>
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search techniques"
                        leftIcon={<span>🔍</span>}
                    />
                </div>

                <div className={styles.filterContainer}>
                    <Select
                        options={confidenceOptions}
                        value={confidenceFilter}
                        onChange={(value) => setConfidenceFilter(value)}
                        placeholder="Filter by confidence"
                    />
                </div>

                <div className={styles.sortContainer}>
                    <Select
                        options={sortOptions}
                        value={sortBy}
                        onChange={(value) => setSortBy(value as 'confidence' | 'id')}
                        placeholder="Sort by"
                    />
                </div>
            </div>

            <div className={styles.matchesList}>
                {filteredMatches.length === 0 ? (
                    <EmptyState
                        title="No Matching Techniques"
                        description={
                            searchTerm || confidenceFilter !== 'all'
                                ? "No techniques match your current filters"
                                : "No techniques were detected in this document"
                        }
                    />
                ) : (
                    filteredMatches.map((match) => (
                        <TechniqueMatchCard
                            key={`${match.techniqueId}-${match.textPosition?.startChar || Math.random()}`}
                            match={match}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
