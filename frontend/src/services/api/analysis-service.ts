import apiClient from './client';
import { AnalysisJob, AnalysisJobStatus, AnalysisOptions } from '../../types/analysis';

export const AnalysisService = {
    // Submit URL for analysis
    submitUrl: async (url: string, options?: AnalysisOptions): Promise<AnalysisJob> => {
        const response = await apiClient.post('/analyze', { url, options });
        return response.data;
    },

    // Submit document for analysis
    submitDocument: async (file: File, options?: AnalysisOptions): Promise<AnalysisJob> => {
        const formData = new FormData();
        formData.append('document', file);

        if (options) {
            formData.append('options', JSON.stringify(options));
        }

        const response = await apiClient.post('/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    // Check job status
    getJobStatus: async (jobId: string): Promise<AnalysisJobStatus> => {
        const response = await apiClient.get(`/analyze/${jobId}`);
        return response.data;
    },
};
