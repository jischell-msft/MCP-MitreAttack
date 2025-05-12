import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './TacticsHeatmap.module.scss';

interface TacticsHeatmapProps {
    tacticsBreakdown: Record<string, number>;
    techniques: any[];
}

export const TacticsHeatmap: React.FC<TacticsHeatmapProps> = ({
    tacticsBreakdown,
    techniques
}) => {
    // Define the tactics in the MITRE ATT&CK kill chain order
    const tacticsOrder = [
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

    // Find the maximum count for scaling
    const maxCount = Math.max(...Object.values(tacticsBreakdown), 1);

    // Get techniques for a specific tactic
    const getTechniquesForTactic = (tacticId: string) => {
        return techniques.filter(technique => {
            // In a real implementation, we would need to map techniques to tactics
            // Here we're assuming the mapping exists in the data
            return technique.tactics?.includes(tacticId);
        });
    };

    // Calculate heat color based on count
    const getHeatColor = (count: number) => {
        if (count === 0) return 'var(--color-background)';

        const intensity = Math.min(count / maxCount, 1);
        return `rgba(234, 67, 53, ${intensity * 0.8 + 0.2})`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.description}>
                <p>
                    This heatmap shows the distribution of detected techniques across the MITRE ATT&CK tactics.
                    Darker colors indicate more techniques detected in that tactic category.
                </p>
            </div>

            <div className={styles.heatmap}>
                {tacticsOrder.map(tactic => {
                    const count = tacticsBreakdown[tactic.id] || 0;
                    const techniques = getTechniquesForTactic(tactic.id);

                    return (
                        <Card
                            key={tactic.id}
                            className={styles.tacticCard}
                            style={{ backgroundColor: getHeatColor(count) }}
                            onClick={() => { }}
                        >
                            <div className={styles.tacticHeader}>
                                <div className={styles.tacticName}>{tactic.name}</div>
                                <div className={styles.tacticCount}>{count}</div>
                            </div>

                            {count > 0 && (
                                <div className={styles.techniques}>
                                    {techniques.slice(0, 3).map((technique) => (
                                        <div key={technique.techniqueId} className={styles.technique}>
                                            <span className={styles.techniqueId}>{technique.techniqueId}</span>
                                            <span className={styles.techniqueConfidence}>
                                                {technique.confidenceScore}%
                                            </span>
                                        </div>
                                    ))}
                                    {techniques.length > 3 && (
                                        <div className={styles.moreTechniques}>
                                            +{techniques.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <div className={styles.legend}>
                <div className={styles.legendTitle}>Legend:</div>
                <div className={styles.legendItems}>
                    <div className={styles.legendItem}>
                        <div
                            className={styles.legendColor}
                            style={{ backgroundColor: 'rgba(234, 67, 53, 0.2)' }}
                        ></div>
                        <div className={styles.legendLabel}>Low</div>
                    </div>
                    <div className={styles.legendItem}>
                        <div
                            className={styles.legendColor}
                            style={{ backgroundColor: 'rgba(234, 67, 53, 0.5)' }}
                        ></div>
                        <div className={styles.legendLabel}>Medium</div>
                    </div>
                    <div className={styles.legendItem}>
                        <div
                            className={styles.legendColor}
                            style={{ backgroundColor: 'rgba(234, 67, 53, 0.8)' }}
                        ></div>
                        <div className={styles.legendLabel}>High</div>
                    </div>
                    <div className={styles.legendItem}>
                        <div
                            className={styles.legendColor}
                            style={{ backgroundColor: 'rgba(234, 67, 53, 1)' }}
                        ></div>
                        <div className={styles.legendLabel}>Maximum</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
