import apiClient from './client';
import { SystemStatus } from '../../types/system';

export const SystemService = {
    // Get system status
    getStatus: async (): Promise<SystemStatus> => {
        const response = await apiClient.get('/system/status');
        return response.data;
    },

    // Trigger MITRE ATT&CK database update
    updateMitreData: async (): Promise<{ jobId: string }> => {
        const response = await apiClient.post('/system/update');
        return response.data;
    },

    // Check health status
    checkHealth: async (): Promise<{ status: string }> => {
        const response = await apiClient.get('/health');
        return response.data;
    },
};
