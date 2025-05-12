import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleApiError } from '../../utils/error-handler';

// API client configuration
const apiConfig: AxiosRequestConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
};

// Create API client instance
const apiClient: AxiosInstance = axios.create(apiConfig);

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // Add authentication token if available
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        // Process successful responses
        return response.data;
    },
    (error) => {
        // Handle errors
        return Promise.reject(handleApiError(error));
    }
);

export default apiClient;
