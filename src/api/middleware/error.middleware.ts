import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { ApplicationError } from '../../utils/errors';

/**
 * Central error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    // Log the error
    logger.error('API error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Determine status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';

    // Map known errors to appropriate status codes
    if (err instanceof z.ZodError) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        errorMessage = 'Invalid request data';
    } else if (err instanceof ApplicationError) {
        // Map application errors to HTTP status codes
        switch (err.code) {
            case 'URL_PROCESSING_FAILED':
            case 'DOCUMENT_PROCESSING_FAILED':
            case 'INVALID_DOCUMENT':
                statusCode = 400;
                break;
            case 'REPORT_NOT_FOUND':
            case 'JOB_NOT_FOUND':
                statusCode = 404;
                break;
            case 'RATE_LIMIT_EXCEEDED':
                statusCode = 429;
                break;
            default:
                statusCode = 500;
        }

        errorCode = err.code;
        errorMessage = err.message;
    }

    // In development, provide more details
    const details = process.env.NODE_ENV === 'development'
        ? { stack: err.stack }
        : undefined;

    // Send error response
    return res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: errorMessage,
            details: err instanceof z.ZodError ? err.format() : details
        }
    });
}
