import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Checkbox } from '../../components/ui/Checkbox/Checkbox';
import styles from './AnalysisOptions.module.scss';

interface AnalysisOptionsProps {
    options: {
        minConfidence: number;
        includeTactics: string[];
        maxResults: number;
        useAzureOpenAI: boolean;
    };
    onChange: (options: any) => void;
    disabled?: boolean;
}

export const AnalysisOptions: React.FC<AnalysisOptionsProps> = ({
    options,
    onChange,
    disabled = false,
}) => {
    const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        onChange({
            ...options,
            minConfidence: isNaN(value) ? 0 : Math.min(100, Math.max(0, value)),
        });
    };

    const handleMaxResultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        onChange({
            ...options,
            maxResults: isNaN(value) ? 10 : Math.max(1, value),
        });
    };

    const handleTacticsChange = (selectedTactics: string[]) => {
        onChange({
            ...options,
            includeTactics: selectedTactics,
        });
    };

    const handleAzureOpenAIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...options,
            useAzureOpenAI: e.target.checked,
        });
    };

    const tacticsOptions = [
        { value: 'reconnaissance', label: 'Reconnaissance' },
        { value: 'resource-development', label: 'Resource Development' },
        { value: 'initial-access', label: 'Initial Access' },
        { value: 'execution', label: 'Execution' },
        { value: 'persistence', label: 'Persistence' },
        { value: 'privilege-escalation', label: 'Privilege Escalation' },
        { value: 'defense-evasion', label: 'Defense Evasion' },
        { value: 'credential-access', label: 'Credential Access' },
        { value: 'discovery', label: 'Discovery' },
        { value: 'lateral-movement', label: 'Lateral Movement' },
        { value: 'collection', label: 'Collection' },
        { value: 'command-and-control', label: 'Command and Control' },
        { value: 'exfiltration', label: 'Exfiltration' },
        { value: 'impact', label: 'Impact' },
    ];

    return (
        <Card className={styles.optionsCard} elevation={0} bordered>
            <h4 className={styles.optionsTitle}>Analysis Options</h4>

            <div className={styles.optionsGrid}>
                <div className={styles.optionItem}>
                    <Input
                        type="number"
                        label="Minimum Confidence (%)"
                        value={options.minConfidence}
                        onChange={handleConfidenceChange}
                        min={0}
                        max={100}
                        disabled={disabled}
                        helperText="Techniques with confidence below this value will be filtered out"
                    />
                </div>

                <div className={styles.optionItem}>
                    <Input
                        type="number"
                        label="Maximum Results"
                        value={options.maxResults}
                        onChange={handleMaxResultsChange}
                        min={1}
                        disabled={disabled}
                        helperText="Maximum number of techniques to include in results"
                    />
                </div>

                <div className={styles.optionItem}>
                    <Select
                        label="Include Tactics"
                        options={tacticsOptions}
                        value={options.includeTactics}
                        onChange={handleTacticsChange}
                        disabled={disabled}
                        multiple
                        helperText="Filter results to specific tactics (optional)"
                    />
                </div>

                <div className={styles.optionItem}>
                    <Checkbox
                        label="Use Azure OpenAI"
                        checked={options.useAzureOpenAI}
                        onChange={handleAzureOpenAIChange}
                        disabled={disabled}
                        helperText="Enable enhanced analysis using Azure OpenAI"
                    />
                </div>
            </div>
        </Card>
    );
};
