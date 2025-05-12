/**
 * Utility Functions
 * 
 * This directory will contain helper functions for:
 * - Error handling
 * - Logging
 * - Date and string manipulation
 * - File operations
 * - API response formatting
 */

// Generate UUID
export function generateUUID(): string {
    return crypto.randomUUID();
}

// Format API response
export function formatApiResponse<T>(success: boolean, data?: T, error?: { code: string; message: string }) {
    if (success && data) {
        return {
            success: true,
            data,
            timestamp: new Date().toISOString()
        };
    }

    return {
        success: false,
        error: error || { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' },
        timestamp: new Date().toISOString()
    };
}

// Additional utility functions will be added as needed
