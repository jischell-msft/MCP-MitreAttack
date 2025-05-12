import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './ReportSummaryView.module.scss';

interface ReportSummaryData {
    matchCount: number;
    highConfidenceCount: number;
    tacticsBreakdown: Record<string, number>;
}

interface ReportSummaryViewProps {
    summary: ReportSummaryData;
}

const TACTICS_ORDER = [
    { id: 'reconnaissance', name: 'Reconnaissance' },
    { id: 'resource-development', name: 'Resource Development' },
    { id: 'initial-access', name: 'Initial Access' },
    { id: 'execution', name: 'Execution' },
    { id: 'persistence', name: 'Persistence' },
    { id: 'privilege-escalation', name: 'Privilege Escalation' },
    { id: 'defense-evasion', name: 'Defense Evasion' },
    { id: 'credential-access', name: 'Credential Access' },
    { id: 'discovery', name: 'Discovery' },
    { id: 'lateral-movement', name: 'Lateral Movement' },
    { id: 'collection', name: 'Collection' },
    { id: 'command-and-control', name: 'Command and Control' },
    { id: 'exfiltration', name: 'Exfiltration' },
    { id: 'impact', name: 'Impact' },
];

const getTacticNameById = (tacticId: string): string => {
    const tactic = TACTICS_ORDER.find(t => t.id === tacticId);
    return tactic ? tactic.name : tacticId;
};

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ summary }) => {
    const topTactics = Object.entries(summary.tacticsBreakdown)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5)
        .map(([tacticId, count]) => ({
            id: tacticId,
            name: getTacticNameById(tacticId),
            count,
        }));

    return (
        <div className={styles.summaryContainer}>
            <Card className={styles.summaryCard} elevation={0}>
                <h2 className={styles.sectionTitle}>Key Statistics</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{summary.matchCount}</div>
                        <div className={styles.statLabel}>Total Techniques Detected</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{summary.highConfidenceCount}</div>
                        <div className={styles.statLabel}>High Confidence Detections</div>
                    </div>
                </div>
            </Card>

            {topTactics.length > 0 && (
                <Card className={styles.summaryCard} elevation={0}>
                    <h2 className={styles.sectionTitle}>Top Tactics</h2>
                    <ul className={styles.tacticsList}>
                        {topTactics.map(tactic => (
                            <li key={tactic.id} className={styles.tacticItem}>
                                <span className={styles.tacticName}>{tactic.name}</span>
                                <span className={styles.tacticCount}>{tactic.count} technique{tactic.count > 1 ? 's' : ''}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Add more summary sections as needed, e.g., Key Findings (narrative), Confidence Charts, etc. */}
            {/* For example:
      <Card className={styles.summaryCard} elevation={0}>
        <h2 className={styles.sectionTitle}>Analyst Notes</h2>
        <p className={styles.notesPlaceholder}>No analyst notes available for this report.</p>
      </Card>
      */}
        </div>
    );
};

// Basic styles for ReportSummaryView.module.scss (conceptual)
/*
.summaryContainer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summaryCard {
  padding: 16px;
}

.sectionTitle {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.statItem {
  background-color: var(--color-background-secondary);
  padding: 12px;
  border-radius: 4px;
  text-align: center;
}

.statValue {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary);
}

.statLabel {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.tacticsList {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tacticItem {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  &:last-child {
    border-bottom: none;
  }
}

.tacticName {
  font-weight: 500;
}

.tacticCount {
  color: var(--color-text-secondary);
}

.notesPlaceholder {
  color: var(--color-text-secondary);
  font-style: italic;
}
*/
