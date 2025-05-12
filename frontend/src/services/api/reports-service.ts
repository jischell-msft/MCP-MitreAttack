import apiClient from './client';
import { PaginatedResponse, ReportSummary, ReportDetail, ReportFilters } from '../../types/reports';

export const ReportsService = {
    // Get list of reports
    getReports: async (filters: ReportFilters): Promise<PaginatedResponse<ReportSummary>> => {
        const response = await apiClient.get('/reports', {
            params: filters,
        });
        return response.data;
    },

    // Get report details
    getReportById: async (id: string): Promise<ReportDetail> => {
        const response = await apiClient.get(`/reports/${id}`);
        return response.data;
    },

    // Delete report
    deleteReport: async (id: string): Promise<void> => {
        await apiClient.delete(`/reports/${id}`);
    },

    // Export report
    exportReport: async (id: string, format: 'json' | 'csv' | 'html' | 'pdf'): Promise<Blob> => {
        const response = await apiClient.post('/reports/export', { id, format }, {
            responseType: 'blob',
        });
        return response.data;
    },
};
