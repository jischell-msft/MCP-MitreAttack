import { AxiosError } from 'axios';

// Custom error class
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public status?: number,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

// Handle API errors
export function handleApiError(error: unknown): AppError {
    if (error instanceof AxiosError) {
        const status = error.response?.status || 500;
        const responseData = error.response?.data;

        // Handle API error responses
        if (responseData?.error) {
            return new AppError(
                responseData.error.code || 'API_ERROR',
                responseData.error.message || error.message,
                status,
                responseData.error.details
            );
        }

        // Handle network errors
        if (error.code === 'ECONNABORTED') {
            return new AppError(
                'REQUEST_TIMEOUT',
                'Request timed out. Please try again.',
                408
            );
        }

        if (!error.response) {
            return new AppError(
                'NETWORK_ERROR',
                'Network error. Please check your connection.',
                0
            );
        }

        // Map status codes to error messages
        switch (status) {
            case 400:
                return new AppError(
                    'BAD_REQUEST',
                    'Invalid request data',
                    status,
                    responseData?.error?.details
                );
            case 401:
                return new AppError(
                    'UNAUTHORIZED',
                    'Authentication required',
                    status
                );
            case 403:
                return new AppError(
                    'FORBIDDEN',
                    'You do not have permission to access this resource',
                    status
                );
            case 404:
                return new AppError(
                    'NOT_FOUND',
                    'The requested resource was not found',
                    status
                );
            case 429:
                return new AppError(
                    'RATE_LIMITED',
                    'Too many requests. Please try again later',
                    status
                );
            case 500:
                return new AppError(
                    'SERVER_ERROR',
                    'An unexpected server error occurred',
                    status
                );
            default:
                return new AppError(
                    'UNKNOWN_ERROR',
                    `Error: ${error.message}`,
                    status
                );
        }
    }

    // Handle non-axios errors
    return new AppError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'An unknown error occurred',
        500
    );
}
