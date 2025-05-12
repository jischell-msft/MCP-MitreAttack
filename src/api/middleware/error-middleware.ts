import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError, ServerError } from '../errors/api-error';
import { sendError } from '../utils/api-response';
import { logger } from '../../utils/logger';

/**
 * Central error handler middleware
 */
export function errorHandlerMiddleware(
    err: Error | ApiError | ZodError,
    req: Request,
    res: Response,
    next: NextFunction
): Response {
    // Log the error
    logger.error('Error encountered:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        query: req.query,
        body: process.env.NODE_ENV === 'development' ? req.body : '[REDACTED IN PRODUCTION]',
        ip: req.ip
    });

    // Handle specific error types
    if (err instanceof ApiError) {
        return sendError(res, err.code, err.message, err.details, err.statusCode);
    }

    if (err instanceof ZodError) {
        return sendError(
            res,
            'VALIDATION_ERROR',
            'Request validation failed',
            formatZodError(err),
            400
        );
    }

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    const serverError = new ServerError(
        isDevelopment ? err.message : 'An unexpected error occurred',
        isDevelopment ? { stack: err.stack } : undefined
    );

    return sendError(
        res,
        serverError.code,
        serverError.message,
        serverError.details,
        serverError.statusCode
    );
}

/**
 * Format Zod errors for a more readable response
 */
function formatZodError(err: ZodError): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const issue of err.errors) {
        const path = issue.path.join('.');

        if (!result[path]) {
            result[path] = [];
        }

        result[path].push(issue.message);
    }

    return result;
}

/**
 * Handle 404 Not Found for undefined routes
 */
export function notFoundMiddleware(req: Request, res: Response): Response {
    return sendError(
        res,
        'NOT_FOUND',
        `Route ${req.method} ${req.path} not found`,
        undefined,
        404
    );
}
