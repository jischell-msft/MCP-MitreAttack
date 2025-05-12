import React, { useState } from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import styles from './TechniqueMatchCard.module.scss';

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
}

interface TechniqueMatchCardProps {
    match: TechniqueMatch;
}

export const TechniqueMatchCard: React.FC<TechniqueMatchCardProps> = ({ match }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpanded = () => {
        setExpanded(!expanded);
    };

    const getConfidenceColor = (score: number): string => {
        if (score >= 85) return 'var(--color-success-strong)'; // High confidence (green)
        if (score >= 60) return 'var(--color-warning-strong)'; // Medium confidence (yellow/orange)
        return 'var(--color-danger-strong)'; // Low confidence (red)
    };

    // Format context with highlighted match text
    const formatContext = (context: string, matchedText: string): React.ReactNode => {
        if (!context || !matchedText || !context.includes(matchedText)) {
            return <span>{context}</span>;
        }

        const parts = context.split(new RegExp(`(${matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <>
                {parts.map((part, index) =>
                    part.toLowerCase() === matchedText.toLowerCase() ? (
                        <mark key={index} className={styles.highlightedText}>
                            {part}
                        </mark>
                    ) : (
                        <React.Fragment key={index}>{part}</React.Fragment>
                    )
                )}
            </>
        );
    };

    const mitreLink = `https://attack.mitre.org/techniques/${match.techniqueId.replace('.', '/')}`; // Handle sub-techniques like T1234.001

    return (
        <Card
            className={`${styles.card} ${expanded ? styles.expanded : ''}`}
            elevation={expanded ? 2 : 1}
            role="article"
            aria-labelledby={`technique-card-header-${match.techniqueId}`}
        >
            <div
                id={`technique-card-header-${match.techniqueId}`}
                className={styles.header}
                onClick={toggleExpanded}
                onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && toggleExpanded()}
                tabIndex={0}
                role="button"
                aria-expanded={expanded}
                aria-controls={`technique-card-content-${match.techniqueId}`}
            >
                <div className={styles.techniqueInfo}>
                    <div className={styles.techniqueId}>
                        <a
                            href={mitreLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} // Prevent card toggle when link is clicked
                            className={styles.mitreLink}
                            aria-label={`View ${match.techniqueId} on MITRE ATT&CK website (opens in new tab)`}
                        >
                            {match.techniqueId}
                        </a>
                    </div>
                    <div className={styles.techniqueName}>{match.techniqueName}</div>
                </div>

                <div className={styles.confidenceScoreWrapper}>
                    <div className={styles.confidenceText} aria-label={`Confidence score: ${match.confidenceScore} percent`}>
                        {match.confidenceScore}% Confidence
                    </div>
                    <div className={styles.confidenceBarContainer}>
                        <div
                            className={styles.confidenceBar}
                            style={{
                                width: `${match.confidenceScore}%`,
                                backgroundColor: getConfidenceColor(match.confidenceScore)
                            }}
                            role="progressbar"
                            aria-valuenow={match.confidenceScore}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        />
                    </div>
                </div>
                <span className={styles.expandIcon} aria-hidden="true">
                    {expanded ? '▼' : '▶'}
                </span>
            </div>

            {expanded && (
                <div
                    id={`technique-card-content-${match.techniqueId}`}
                    className={styles.content}
                    role="region"
                >
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Matched Text:</h3>
                        <p className={styles.matchedTextValue}>{match.matchedText}</p>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Context:</h3>
                        <p className={styles.contextValue}>
                            {formatContext(match.context, match.matchedText)}
                        </p>
                    </div>

                    {match.textPosition && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Text Position:</h3>
                            <p className={styles.textPositionValue}>
                                Start: {match.textPosition.startChar}, End: {match.textPosition.endChar}
                            </p>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Button
                            variant="outline"
                            size="small"
                            onClick={() => window.open(mitreLink, '_blank')}
                            // icon={<span>🌍</span>} // Example icon
                            aria-label={`View details for ${match.techniqueId} on MITRE ATT&CK website (opens in new tab)`}
                        >
                            View on MITRE ATT&CK
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
