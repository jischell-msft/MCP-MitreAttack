import { useState, useEffect } from 'react';

interface AnalysisOptions {
    minConfidence: number;
    includeTactics: string[];
    maxResults: number;
    useAzureOpenAI: boolean;
}

const defaultOptions: AnalysisOptions = {
    minConfidence: 65,
    includeTactics: [],
    maxResults: 20,
    useAzureOpenAI: true,
};

export const useAnalysisOptions = () => {
    const [options, setOptions] = useState<AnalysisOptions>(() => {
        // Try to load saved options from localStorage
        const savedOptions = localStorage.getItem('analysisOptions');
        if (savedOptions) {
            try {
                return { ...defaultOptions, ...JSON.parse(savedOptions) };
            } catch (error) {
                console.error('Error parsing saved options:', error);
                return defaultOptions;
            }
        }
        return defaultOptions;
    });

    // Save options to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('analysisOptions', JSON.stringify(options));
        } catch (error) {
            console.error('Error saving options:', error);
        }
    }, [options]);

    const updateOptions = (newOptions: Partial<AnalysisOptions>) => {
        setOptions(prevOptions => ({
            ...prevOptions,
            ...newOptions,
        }));
    };

    const resetOptions = () => {
        setOptions(defaultOptions);
    };

    return {
        options,
        updateOptions,
        resetOptions,
    };
};
