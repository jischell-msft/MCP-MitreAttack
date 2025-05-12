import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './ReportSummaryView.module.scss';

interface ReportSummary {
    matchCount: number;
    highConfidenceCount: number;
    confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
    };
    tacticsBreakdown: Record<string, number>;
    topTechniques: {
        id: string;
        name: string;
        confidence: number;
    }[];
}

interface ReportSummaryViewProps {
    summary: ReportSummary;
}

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ summary }) => {
    // Calculate percentages for confidence distribution
    const totalMatches = summary.matchCount || 1;
    const highPercent = (summary.confidenceDistribution?.high / totalMatches) * 100;
    const mediumPercent = (summary.confidenceDistribution?.medium / totalMatches) * 100;
    const lowPercent = (summary.confidenceDistribution?.low / totalMatches) * 100;

    // Get tactics with the most techniques
    const topTactics = Object.entries(summary.tacticsBreakdown || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tacticId, count]) => {
            // Map the tactic ID to a human-readable name
            const tacticName = getTacticName(tacticId);
            return { id: tacticId, name: tacticName, count };
        });

    // Helper function to convert tactic ID to readable name
    function getTacticName(tacticId: string): string {
        const tacticMap: Record<string, string> = {
            'reconnaissance': 'Reconnaissance',
            'resource-development': 'Resource Development',
            'initial-access': 'Initial Access',
            'execution': 'Execution',
            'persistence': 'Persistence',
            'privilege-escalation': 'Privilege Escalation',
            'defense-evasion': 'Defense Evasion',
            'credential-access': 'Credential Access',
            'discovery': 'Discovery',
            'lateral-movement': 'Lateral Movement',
            'collection': 'Collection',
            'command-and-control': 'Command and Control',
            'exfiltration': 'Exfiltration',
            'impact': 'Impact'
        };

        return tacticMap[tacticId] || tacticId;
    }

    return (
        <div className={styles.container}>
            <div className={styles.statsGrid}>
                <Card className={styles.statsCard}>
                    <div className={styles.statsTitle}>Total Technique Matches</div>
                    <div className={styles.statsValue}>{summary.matchCount}</div>
                    <div className={styles.statsMeta}>
                        <span className={styles.highConfidence}>
                            {summary.highConfidenceCount} high confidence
                        </span>
                    </div>
                </Card>

                <Card className={styles.statsCard}>
                    <div className={styles.statsTitle}>Confidence Distribution</div>
                    <div className={styles.confidenceChart}>
                        <div className={styles.confidenceBars}>
                            <div
                                className={styles.highBar}
                                style={{ width: `${highPercent}%` }}
                                title={`High confidence: ${summary.confidenceDistribution?.high} matches (${highPercent.toFixed(1)}%)`}
                            />
                            <div
                                className={styles.mediumBar}
                                style={{ width: `${mediumPercent}%` }}
                                title={`Medium confidence: ${summary.confidenceDistribution?.medium} matches (${mediumPercent.toFixed(1)}%)`}
                            />
                            <div
                                className={styles.lowBar}
                                style={{ width: `${lowPercent}%` }}
                                title={`Low confidence: ${summary.confidenceDistribution?.low} matches (${lowPercent.toFixed(1)}%)`}
                            />
                        </div>
                        <div className={styles.confidenceLegend}>
                            <div className={styles.legendItem}>
                                <div className={styles.highSwatch} />
                                <span>High</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={styles.mediumSwatch} />
                                <span>Medium</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={styles.lowSwatch} />
                                <span>Low</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className={styles.statsCard}>
                    <div className={styles.statsTitle}>Top Tactics</div>
                    <div className={styles.tacticsList}>
                        {topTactics.length > 0 ? (
                            topTactics.map(tactic => (
                                <div key={tactic.id} className={styles.tacticItem}>
                                    <div className={styles.tacticName}>{tactic.name}</div>
                                    <div className={styles.tacticCount}>{tactic.count} techniques</div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.noData}>No tactics detected</div>
                        )}
                    </div>
                </Card>
            </div>

            <Card className={styles.techniqueCard}>
                <div className={styles.cardTitle}>Top Techniques by Confidence</div>

                <div className={styles.techniqueList}>
                    {summary.topTechniques && summary.topTechniques.length > 0 ? (
                        summary.topTechniques.map(technique => (
                            <div key={technique.id} className={styles.techniqueItem}>
                                <div className={styles.techniqueHeader}>
                                    <div className={styles.techniqueId}>
                                        <a
                                            href={`https://attack.mitre.org/techniques/${technique.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {technique.id}
                                        </a>
                                    </div>
                                    <div
                                        className={styles.techniqueConfidence}
                                        style={{
                                            backgroundColor: getConfidenceColor(technique.confidence)
                                        }}
                                    >
                                        {technique.confidence}%
                                    </div>
                                </div>
                                <div className={styles.techniqueName}>{technique.name}</div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.noData}>No techniques detected</div>
                    )}
                </div>
            </Card>
        </div>
    );
};

// Helper function to get color based on confidence score
function getConfidenceColor(score: number): string {
    if (score >= 85) return '#34a853'; // High confidence (green)
    if (score >= 60) return '#fbbc04'; // Medium confidence (yellow)
    return '#ea4335'; // Low confidence (red)
}
