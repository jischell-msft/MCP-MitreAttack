import React, { useState } from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import styles from './TechniqueMatchCard.module.scss';

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
        if (score >= 85) return '#34a853'; // High confidence (green)
        if (score >= 60) return '#fbbc04'; // Medium confidence (yellow)
        return '#ea4335'; // Low confidence (red)
    };

    // Format context with highlighted match text
    const formatContext = (context: string, matchedText: string): React.ReactNode => {
        if (!context.includes(matchedText)) {
            return <span>{context}</span>;
        }

        const parts = context.split(matchedText);
        return (
            <>
                {parts.map((part, index) => (
                    <React.Fragment key={index}>
                        {part}
                        {index < parts.length - 1 && (
                            <span className={styles.highlightedText}>{matchedText}</span>
                        )}
                    </React.Fragment>
                ))}
            </>
        );
    };

    return (
        <Card
            className={`${styles.card} ${expanded ? styles.expanded : ''}`}
            elevation={1}
        >
            <div className={styles.header} onClick={toggleExpanded}>
                <div className={styles.techniqueInfo}>
                    <div className={styles.techniqueId}>
                        <a
                            href={`https://attack.mitre.org/techniques/${match.techniqueId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {match.techniqueId}
                        </a>
                    </div>
                    <div className={styles.techniqueName}>{match.techniqueName}</div>
                </div>

                <div className={styles.confidenceScore}>
                    <div
                        className={styles.confidenceBar}
                        style={{
                            width: `${match.confidenceScore}%`,
                            backgroundColor: getConfidenceColor(match.confidenceScore)
                        }}
                    />
                    <div className={styles.confidenceText}>{match.confidenceScore}% Confidence</div>
                </div>
            </div>

            {expanded && (
                <div className={styles.content}>
                    <div className={styles.sectionTitle}>Matched Text:</div>
                    <div className={styles.matchedText}>{match.matchedText}</div>

                    <div className={styles.sectionTitle}>Context:</div>
                    <div className={styles.context}>
                        {formatContext(match.context, match.matchedText)}
                    </div>

                    <div className={styles.actions}>
                        <Button
                            variant="outline"
                            size="small"
                            onClick={() => window.open(`https://attack.mitre.org/techniques/${match.techniqueId}`, '_blank')}
                        >
                            View on MITRE ATT&CK
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
