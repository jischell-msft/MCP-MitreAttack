import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './ReportSummaryView.module.scss';

interface ReportSummary {
    matchCount: number;
    highConfidenceCount: number;
    tacticsBreakdown: Record<string, number>;
    topTechniques: {
        id: string;
        name: string;
        confidence: number;
    }[];
    keyFindings: string[];
}

interface ReportSummaryViewProps {
    summary: ReportSummary;
}

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ summary }) => {
    // Get tactics with the highest counts
    const topTactics = Object.entries(summary.tacticsBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

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
        'impact': 'Impact'
    };

    return (
        <div className={styles.container}>
            <div className={styles.statisticsSection}>
                <Card className={styles.statsCard}>
                    <div className={styles.statTitle}>Total Techniques</div>
                    <div className={styles.statValue}>{summary.matchCount}</div>
                </Card>

                <Card className={styles.statsCard}>
                    <div className={styles.statTitle}>High Confidence</div>
                    <div className={styles.statValue}>{summary.highConfidenceCount}</div>
                    <div className={styles.statSubtext}>
                        {summary.matchCount > 0
                            ? `(${Math.round((summary.highConfidenceCount / summary.matchCount) * 100)}%)`
                            : '(0%)'
                        }
                    </div>
                </Card>

                <Card className={styles.statsCard}>
                    <div className={styles.statTitle}>Primary Tactics</div>
                    <div className={styles.statValue}>
                        {topTactics.length > 0
                            ? tacticNames[topTactics[0][0]] || topTactics[0][0]
                            : 'None'
                        }
                    </div>
                    <div className={styles.statSubtext}>
                        {topTactics.length > 1
                            ? `+${topTactics.length - 1} others`
                            : ''
                        }
                    </div>
                </Card>
            </div>

            <div className={styles.findingsSection}>
                <h2 className={styles.sectionTitle}>Key Findings</h2>
                {summary.keyFindings && summary.keyFindings.length > 0 ? (
                    <ul className={styles.keyFindingsList}>
                        {summary.keyFindings.map((finding, index) => (
                            <li key={index} className={styles.keyFindingItem}>
                                {finding}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className={styles.noFindings}>
                        No key findings were generated for this report.
                    </div>
                )}
            </div>

            <div className={styles.techniquesSection}>
                <h2 className={styles.sectionTitle}>Top Techniques</h2>
                <div className={styles.topTechniquesList}>
                    {summary.topTechniques.map((technique) => (
                        <Card key={technique.id} className={styles.techniqueCard}>
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
                                <div className={styles.techniqueConfidence}>
                                    {technique.confidence}%
                                </div>
                            </div>
                            <div className={styles.techniqueName}>
                                {technique.name}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};
