import React, { useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { AnalysisOptions } from './AnalysisOptions';
import { isValidUrl } from '../../utils/validation';
import styles from './UrlSubmissionForm.module.scss';

interface UrlSubmissionFormProps {
    onSubmit: (url: string) => void;
    isSubmitting: boolean;
    options: any;
    onOptionsChange: (options: any) => void;
}

export const UrlSubmissionForm: React.FC<UrlSubmissionFormProps> = ({
    onSubmit,
    isSubmitting,
    options,
    onOptionsChange,
}) => {
    const [url, setUrl] = useState('');
    const [urlError, setUrlError] = useState('');
    const [showOptions, setShowOptions] = useState(false);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUrl(value);

        // Clear previous error when user starts typing again
        if (urlError) {
            setUrlError('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate URL
        if (!url.trim()) {
            setUrlError('URL is required');
            return;
        }

        if (!isValidUrl(url)) {
            setUrlError('Please enter a valid URL');
            return;
        }

        onSubmit(url);
    };

    const toggleOptions = () => {
        setShowOptions(!showOptions);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputContainer}>
                <Input
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="Enter URL to analyze (e.g., https://example.com/document.pdf)"
                    label="Document URL"
                    error={urlError}
                    fullWidth
                    disabled={isSubmitting}
                    leftIcon={<span>🔗</span>}
                    required
                />
            </div>

            <div className={styles.optionsContainer}>
                <Button
                    type="button"
                    variant="text"
                    onClick={toggleOptions}
                    className={styles.optionsToggle}
                >
                    {showOptions ? 'Hide Options' : 'Show Options'}
                </Button>

                {showOptions && (
                    <AnalysisOptions
                        options={options}
                        onChange={onOptionsChange}
                        disabled={isSubmitting}
                    />
                )}
            </div>

            <div className={styles.actions}>
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    fullWidth
                >
                    {isSubmitting ? 'Analyzing...' : 'Analyze URL'}
                </Button>
            </div>
        </form>
    );
};
