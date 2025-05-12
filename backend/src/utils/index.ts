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

import crypto from 'crypto';

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

/**
 * Format a date as an ISO string without milliseconds
 */
export function formatDate(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry wrapper for async functions
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: { retries: number; delay: number; onError?: (error: Error, attempt: number) => void }
): Promise<T> {
    const { retries, delay, onError } = options;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            if (onError) {
                onError(error, attempt);
            }

            if (attempt <= retries) {
                await sleep(delay);
            }
        }
    }

    throw lastError!;
}

// Additional utility functions will be added as needed
