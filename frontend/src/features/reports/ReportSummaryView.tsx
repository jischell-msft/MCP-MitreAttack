import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './ReportSummaryView.module.scss';

interface ReportSummary {
    matchCount: number;
    highConfidenceCount: number;
    tacticsBreakdown: Record<string, number>;
    topTechniques: Array<{ id: string; name: string; confidence: number }>;
    keyFindings: string[];
}

interface ReportSummaryViewProps {
    summary: ReportSummary;
}

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ summary }) => {
    // Calculate percentages for the chart
    const highConfidencePercentage = (summary.highConfidenceCount / summary.matchCount) * 100 || 0;
    const mediumConfidencePercentage =
        ((summary.matchCount - summary.highConfidenceCount) / summary.matchCount) * 100 || 0;

    return (
        <div className={styles.container}>
            <div className={styles.statsRow}>
                <Card className={styles.statCard}>
                    <div className={styles.statTitle}>Total Techniques</div>
                    <div className={styles.statValue}>{summary.matchCount}</div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.statTitle}>High Confidence</div>
                    <div className={styles.statValue}>{summary.highConfidenceCount}</div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.statTitle}>Tactics Covered</div>
                    <div className={styles.statValue}>{Object.keys(summary.tacticsBreakdown).length}</div>
                </Card>
            </div>

            <div className={styles.contentRow}>
                <Card className={styles.confidenceChartCard}>
                    <h3 className={styles.sectionTitle}>Confidence Distribution</h3>
                    <div className={styles.confidenceChart}>
                        <div className={styles.chartBar}>
                            <div
                                className={styles.highConfidenceBar}
                                style={{ width: `${highConfidencePercentage}%` }}
                            >
                                {highConfidencePercentage > 10 && `${Math.round(highConfidencePercentage)}%`}
                            </div>
                            <div
                                className={styles.mediumConfidenceBar}
                                style={{ width: `${mediumConfidencePercentage}%` }}
                            >
                                {mediumConfidencePercentage > 10 && `${Math.round(mediumConfidencePercentage)}%`}
                            </div>
                        </div>
                        <div className={styles.chartLegend}>
                            <div className={styles.legendItem}>
                                <div className={styles.legendColor} style={{ backgroundColor: 'var(--color-success)' }}></div>
                                <div className={styles.legendText}>High Confidence (85%+)</div>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={styles.legendColor} style={{ backgroundColor: 'var(--color-warning)' }}></div>
                                <div className={styles.legendText}>Medium Confidence (&lt;85%)</div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className={styles.topTechniquesCard}>
                    <h3 className={styles.sectionTitle}>Top Techniques</h3>
                    <div className={styles.topTechniquesList}>
                        {summary.topTechniques.length > 0 ? (
                            summary.topTechniques.map((technique, index) => (
                                <div key={technique.id} className={styles.topTechniqueItem}>
                                    <div className={styles.techniqueRank}>{index + 1}</div>
                                    <div className={styles.techniqueInfo}>
                                        <div className={styles.techniqueId}>{technique.id}</div>
                                        <div className={styles.techniqueName}>{technique.name}</div>
                                    </div>
                                    <div className={styles.techniqueConfidence}>
                                        {technique.confidence}%
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyMessage}>No techniques detected</div>
                        )}
                    </div>
                </Card>
            </div>

            <Card className={styles.keyFindingsCard}>
                <h3 className={styles.sectionTitle}>Key Findings</h3>
                {summary.keyFindings.length > 0 ? (
                    <ul className={styles.keyFindingsList}>
                        {summary.keyFindings.map((finding, index) => (
                            <li key={index} className={styles.keyFindingItem}>{finding}</li>
                        ))}
                    </ul>
                ) : (
                    <div className={styles.emptyMessage}>No key findings available</div>
                )}
            </Card>
        </div>
    );
};
