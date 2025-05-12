import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './ReportSummaryView.module.scss';

interface ReportSummary {
    matchCount: number;
    highConfidenceCount: number;
    tacticsBreakdown: Record<string, number>;
    topTechniques: Array<{
        id: string;
        name: string;
        confidenceScore: number;
    }>;
}

interface ReportSummaryViewProps {
    summary: ReportSummary;
}

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ summary }) => {
    // Get tactics with at least one technique
    const activeTactics = Object.entries(summary.tacticsBreakdown)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .map(([tacticId, count]) => ({
            id: tacticId,
            count,
        }));

    // Map tactic IDs to readable names
    const tacticNames: Record<string, string> = {
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
        'impact': 'Impact',
    };

    return (
        <div className={styles.container}>
            <div className={styles.statisticsSection}>
                <h2 className={styles.sectionTitle}>Key Statistics</h2>
                <div className={styles.statisticsContainer}>
                    <Card className={styles.statCard}>
                        <div className={styles.statValue}>{summary.matchCount}</div>
                        <div className={styles.statLabel}>Techniques Detected</div>
                    </Card>

                    <Card className={styles.statCard}>
                        <div className={styles.statValue}>{summary.highConfidenceCount}</div>
                        <div className={styles.statLabel}>High Confidence</div>
                    </Card>

                    <Card className={styles.statCard}>
                        <div className={styles.statValue}>{activeTactics.length}</div>
                        <div className={styles.statLabel}>Tactics Covered</div>
                    </Card>
                </div>
            </div>

            <div className={styles.techniquesSection}>
                <h2 className={styles.sectionTitle}>Top Techniques</h2>
                <div className={styles.topTechniquesContainer}>
                    {summary.topTechniques.length > 0 ? (
                        summary.topTechniques.map(technique => (
                            <Card key={technique.id} className={styles.techniqueCard}>
                                <div className={styles.techniqueHeader}>
                                    <div className={styles.techniqueId}>{technique.id}</div>
                                    <div className={styles.confidenceScore}>{technique.confidenceScore}%</div>
                                </div>
                                <div className={styles.techniqueName}>{technique.name}</div>
                            </Card>
                        ))
                    ) : (
                        <div className={styles.noTechniquesMessage}>
                            No techniques were detected in this document
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.tacticsSection}>
                <h2 className={styles.sectionTitle}>Tactics Coverage</h2>
                <div className={styles.tacticsContainer}>
                    {activeTactics.length > 0 ? (
                        activeTactics.map(tactic => (
                            <div key={tactic.id} className={styles.tacticItem}>
                                <div className={styles.tacticName}>
                                    {tacticNames[tactic.id] || tactic.id}
                                </div>
                                <div className={styles.tacticCount}>{tactic.count}</div>
                                <div
                                    className={styles.tacticBar}
                                    style={{
                                        width: `${Math.min(100, (tactic.count / activeTactics[0].count) * 100)}%`
                                    }}
                                />
                            </div>
                        ))
                    ) : (
                        <div className={styles.noTacticsMessage}>
                            No tactics were covered in this document
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
