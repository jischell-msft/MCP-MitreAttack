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
    riskAssessment?: {
        overallRisk: 'low' | 'medium' | 'high' | 'critical';
        riskScore: number;
        riskFactors: string[];
    };
}

interface ReportSummaryViewProps {
    summary: ReportSummary;
}

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ summary }) => {
    // Calculate the tactics with the most techniques
    const topTactics = Object.entries(summary.tacticsBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ id, count }));

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

    // Get risk level color
    const getRiskColor = (risk?: 'low' | 'medium' | 'high' | 'critical') => {
        switch (risk) {
            case 'critical': return '#d32f2f'; // dark red
            case 'high': return '#f44336'; // red
            case 'medium': return '#ff9800'; // orange
            case 'low': return '#4caf50'; // green
            default: return '#9e9e9e'; // grey
        }
    };

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
                    <div className={styles.statSubtext}>
                        ({Math.round((summary.highConfidenceCount / summary.matchCount) * 100) || 0}%)
                    </div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.statTitle}>Tactics Covered</div>
                    <div className={styles.statValue}>
                        {Object.values(summary.tacticsBreakdown).filter(count => count > 0).length}
                    </div>
                    <div className={styles.statSubtext}>of 14 total</div>
                </Card>

                {summary.riskAssessment && (
                    <Card
                        className={`${styles.statCard} ${styles.riskCard}`}
                        style={{ borderTopColor: getRiskColor(summary.riskAssessment.overallRisk) }}
                    >
                        <div className={styles.statTitle}>Overall Risk</div>
                        <div
                            className={styles.riskValue}
                            style={{ color: getRiskColor(summary.riskAssessment.overallRisk) }}
                        >
                            {summary.riskAssessment.overallRisk.toUpperCase()}
                        </div>
                        <div className={styles.statSubtext}>
                            Score: {summary.riskAssessment.riskScore}/100
                        </div>
                    </Card>
                )}
            </div>

            <div className={styles.keyFindingsCard}>
                <Card>
                    <h3 className={styles.sectionTitle}>Key Findings</h3>

                    <div className={styles.findingsSection}>
                        <h4 className={styles.findingSectionTitle}>Top Techniques</h4>
                        <ul className={styles.techniquesList}>
                            {summary.topTechniques.map((technique) => (
                                <li key={technique.id} className={styles.techniqueListing}>
                                    <span className={styles.techniqueId}>{technique.id}</span>
                                    <span className={styles.techniqueName}>{technique.name}</span>
                                    <span className={styles.techniqueConfidence}>
                                        {technique.confidenceScore}% Confidence
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.findingsSection}>
                        <h4 className={styles.findingSectionTitle}>Most Common Tactics</h4>
                        <ul className={styles.tacticsList}>
                            {topTactics.map((tactic) => (
                                <li key={tactic.id} className={styles.tacticListing}>
                                    <span className={styles.tacticName}>{tacticNames[tactic.id] || tactic.id}</span>
                                    <span className={styles.tacticCount}>{tactic.count} techniques</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {summary.riskAssessment && summary.riskAssessment.riskFactors.length > 0 && (
                        <div className={styles.findingsSection}>
                            <h4 className={styles.findingSectionTitle}>Risk Factors</h4>
                            <ul className={styles.riskFactorsList}>
                                {summary.riskAssessment.riskFactors.map((factor, index) => (
                                    <li key={index} className={styles.riskFactorListing}>
                                        {factor}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
