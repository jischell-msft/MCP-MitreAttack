import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card/Card';
import { Tabs, Tab } from '../../components/ui/Tabs/Tabs';
import { UrlSubmissionForm } from './UrlSubmissionForm';
import { FileUploadForm } from './FileUploadForm';
import { RecentSubmissions } from './RecentSubmissions';
import { useAnalysisOptions } from '../../hooks/useAnalysisOptions';
import { useAppContext } from '../../context/AppContext';
import { AnalysisService } from '../../services/api/analysis-service';
import styles from './AnalysisPage.module.scss';

export const AnalysisPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const { options, updateOptions } = useAnalysisOptions();
    const { dispatch } = useAppContext();
    const navigate = useNavigate();

    const handleTabChange = (tab: 'url' | 'file') => {
        setActiveTab(tab);
    };

    const handleUrlSubmit = async (url: string) => {
        setIsSubmitting(true);

        try {
            const response = await AnalysisService.submitUrl(url, options);

            setSubmissionId(response.data.jobId);
            addToRecentSubmissions({ type: 'url', url, timestamp: new Date() });

            // Poll for job status and navigate to result when complete
            pollJobStatus(response.data.jobId);

            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    type: 'success',
                    message: 'URL submitted successfully',
                    autoClose: true
                }
            });
        } catch (error) {
            console.error('URL submission error:', error);

            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    type: 'error',
                    message: error.message || 'Failed to submit URL',
                    autoClose: true
                }
            });

            setIsSubmitting(false);
        }
    };

    const handleFileSubmit = async (file: File) => {
        setIsSubmitting(true);

        try {
            const response = await AnalysisService.submitDocument(file, options);

            setSubmissionId(response.data.jobId);
            addToRecentSubmissions({ type: 'file', filename: file.name, timestamp: new Date() });

            // Poll for job status and navigate to result when complete
            pollJobStatus(response.data.jobId);

            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    type: 'success',
                    message: 'Document submitted successfully',
                    autoClose: true
                }
            });
        } catch (error) {
            console.error('File submission error:', error);

            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    type: 'error',
                    message: error.message || 'Failed to submit document',
                    autoClose: true
                }
            });

            setIsSubmitting(false);
        }
    };

    const pollJobStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const status = await AnalysisService.getJobStatus(jobId);

                if (status.data.status === 'completed') {
                    clearInterval(interval);
                    navigate(`/reports/${status.data.reportId}`);
                } else if (status.data.status === 'failed') {
                    clearInterval(interval);
                    setIsSubmitting(false);

                    dispatch({
                        type: 'ADD_NOTIFICATION',
                        payload: {
                            type: 'error',
                            message: status.data.error?.message || 'Analysis failed',
                            autoClose: true
                        }
                    });
                }
            } catch (error) {
                console.error('Error polling job status:', error);
                clearInterval(interval);
                setIsSubmitting(false);
            }
        }, 2000); // Poll every 2 seconds

        // Clear interval on component unmount
        return () => clearInterval(interval);
    };

    const addToRecentSubmissions = (submission: any) => {
        // Get the recent submissions component to handle this
        const recentSubmissionsElement = document.querySelector('recent-submissions-component');
        if (recentSubmissionsElement && typeof (recentSubmissionsElement as any).addSubmission === 'function') {
            (recentSubmissionsElement as any).addSubmission(submission);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Document Analysis</h1>

            <div className={styles.content}>
                <div className={styles.formContainer}>
                    <Card>
                        <Tabs
                            activeTab={activeTab}
                            onChange={handleTabChange}
                        >
                            <Tab id="url" label="URL">
                                <UrlSubmissionForm
                                    onSubmit={handleUrlSubmit}
                                    isSubmitting={isSubmitting}
                                    options={options}
                                    onOptionsChange={updateOptions}
                                />
                            </Tab>
                            <Tab id="file" label="Upload Document">
                                <FileUploadForm
                                    onSubmit={handleFileSubmit}
                                    isSubmitting={isSubmitting}
                                    options={options}
                                    onOptionsChange={updateOptions}
                                />
                            </Tab>
                        </Tabs>
                    </Card>
                </div>

                <div className={styles.recentContainer}>
                    <RecentSubmissions />
                </div>
            </div>
        </div>
    );
};
