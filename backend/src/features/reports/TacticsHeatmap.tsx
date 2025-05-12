import React, { useState } from 'react'; // Added useState for potential interactivity
import { Card } from '../../components/ui/Card/Card';
import styles from './TacticsHeatmap.module.scss';

// TechniqueMatch interface (can be imported from a shared types file)
// Ensure this matches the structure of items in the 'techniques' prop
interface TechniqueMatchForHeatmap {
    techniqueId: string;
    techniqueName: string; // For display in tooltip or expanded view
    confidenceScore: number; // For display or styling
    tactics?: string[]; // Crucial for mapping technique to tactic
    // other relevant fields
}

interface TacticsHeatmapProps {
    tacticsBreakdown: Record<string, number>; // Key: tacticId, Value: count of techniques
    techniques: TechniqueMatchForHeatmap[];    // Array of all matched techniques in the report
}

// Define the tactics in the MITRE ATT&CK kill chain order
// This could be imported from a shared constants file
const TACTICS_ORDER = [
    { id: 'reconnaissance', name: 'Reconnaissance', shortName: 'RE' },
    { id: 'resource-development', name: 'Resource Development', shortName: 'RD' },
    { id: 'initial-access', name: 'Initial Access', shortName: 'IA' },
    { id: 'execution', name: 'Execution', shortName: 'EX' },
    { id: 'persistence', name: 'Persistence', shortName: 'PE' },
    { id: 'privilege-escalation', name: 'Privilege Escalation', shortName: 'PRE' },
    { id: 'defense-evasion', name: 'Defense Evasion', shortName: 'DE' },
    { id: 'credential-access', name: 'Credential Access', shortName: 'CA' },
    { id: 'discovery', name: 'Discovery', shortName: 'DI' },
    { id: 'lateral-movement', name: 'Lateral Movement', shortName: 'LM' },
    { id: 'collection', name: 'Collection', shortName: 'CO' },
    { id: 'command-and-control', name: 'Command and Control', shortName: 'C2' },
    { id: 'exfiltration', name: 'Exfiltration', shortName: 'EXF' },
    { id: 'impact', name: 'Impact', shortName: 'IMP' },
];

export const TacticsHeatmap: React.FC<TacticsHeatmapProps> = ({
    tacticsBreakdown,
    techniques // This prop should contain all techniques from the report
}) => {
    const [selectedTactic, setSelectedTactic] = useState<string | null>(null);

    // Find the maximum count for scaling heatmap colors
    const maxCount = Math.max(...Object.values(tacticsBreakdown).filter(v => typeof v === 'number'), 1); // Ensure at least 1 to avoid division by zero

    // Get techniques for a specific tactic
    const getTechniquesForTactic = (tacticId: string): TechniqueMatchForHeatmap[] => {
        return techniques.filter(technique =>
            technique.tactics && technique.tactics.includes(tacticId)
        ).sort((a, b) => b.confidenceScore - a.confidenceScore); // Sort by confidence
    };

    // Calculate heat color based on count
    const getHeatColor = (count: number): string => {
        if (count === 0) return 'var(--color-background-neutral-subtle)'; // Use a subtle background for zero count

        const intensity = Math.min(count / maxCount, 1); // Normalize intensity
        // Using a red-based heatmap, adjust alpha for intensity
        // Example: rgba(220, 53, 69, alpha) where alpha ranges from 0.1 (low) to 1.0 (high)
        return `rgba(234, 67, 53, ${intensity * 0.8 + 0.2})`; // As per original plan
    };

    const handleTacticClick = (tacticId: string) => {
        setSelectedTactic(selectedTactic === tacticId ? null : tacticId);
        // Potentially scroll to or filter a list of techniques for this tactic elsewhere
    };

    return (
        <div className={styles.container}>
            <div className={styles.description}>
                <p>
                    This heatmap visualizes the distribution of detected MITRE ATT&CK techniques across various tactics.
                    Darker shades indicate a higher concentration of techniques identified within that tactic.
                    Click on a tactic to see more details (if implemented).
                </p>
            </div>

            <div className={styles.heatmapGrid}>
                {TACTICS_ORDER.map(tactic => {
                    const count = tacticsBreakdown[tactic.id] || 0;
                    const tacticTechniques = getTechniquesForTactic(tactic.id);
                    const isSelected = selectedTactic === tactic.id;

                    return (
                        <Card
                            key={tactic.id}
                            className={`${styles.tacticCard} ${isSelected ? styles.selected : ''}`}
                            style={{ backgroundColor: getHeatColor(count) }}
                            onClick={() => handleTacticClick(tactic.id)}
                            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleTacticClick(tactic.id)}
                            tabIndex={0}
                            aria-label={`${tactic.name}: ${count} technique${count === 1 ? '' : 's'} detected. Click to ${isSelected ? 'deselect' : 'select'}.`}
                            role="button"
                        >
                            <div className={styles.tacticHeader}>
                                <div className={styles.tacticName} title={tactic.name}>{tactic.name}</div>
                                <div className={styles.tacticCount}>{count}</div>
                            </div>

                            {count > 0 && (
                                <div className={styles.techniquesPreview}>
                                    {tacticTechniques.slice(0, 3).map((technique) => (
                                        <div key={technique.techniqueId} className={styles.techniqueItem} title={`${technique.techniqueId}: ${technique.techniqueName} (${technique.confidenceScore}%)`}>
                                            <span className={styles.techniqueIdBadge}>{technique.techniqueId}</span>
                                        </div>
                                    ))}
                                    {tacticTechniques.length > 3 && (
                                        <div className={styles.moreTechniquesBadge}>
                                            +{tacticTechniques.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <div className={styles.legend}>
                <div className={styles.legendTitle}>Legend (Intensity):</div>
                <div className={styles.legendItems}>
                    {[0.2, 0.5, 0.8, 1.0].map(intensityScale => (
                        <div key={intensityScale} className={styles.legendItem}>
                            <div
                                className={styles.legendColorBox}
                                style={{ backgroundColor: `rgba(234, 67, 53, ${intensityScale})` }}
                            />
                            <div className={styles.legendLabel}>
                                {intensityScale === 0.2 && 'Low'}
                                {intensityScale === 0.5 && 'Medium'}
                                {intensityScale === 0.8 && 'High'}
                                {intensityScale === 1.0 && 'Max'}
                            </div>
                        </div>
                    ))}
                    <div className={styles.legendItem}>
                        <div
                            className={styles.legendColorBox}
                            style={{ backgroundColor: 'var(--color-background-neutral-subtle)' }}
                        />
                        <div className={styles.legendLabel}>None</div>
                    </div>
                </div>
            </div>

            {/* Optional: Display details for selected tactic */}
            {selectedTactic && (
                <div className={styles.selectedTacticDetails}>
                    <h3>Techniques for {TACTICS_ORDER.find(t => t.id === selectedTactic)?.name}</h3>
                    <ul>
                        {getTechniquesForTactic(selectedTactic).map(tech => (
                            <li key={tech.techniqueId}>{tech.techniqueId} - {tech.techniqueName} ({tech.confidenceScore}%)</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
