import { Response } from 'express';

/**
 * Standard success response helper
 */
export function sendSuccess<T>(res: Response, data: T, meta?: any, statusCode = 200): Response {
    return res.status(statusCode).json({
        success: true,
        data,
        meta: {
            ...meta,
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || '1.0.0'
        }
    });
}

/**
 * Standard error response helper
 */
export function sendError(
    res: Response,
    code: string,
    message: string,
    details?: any,
    statusCode = 400
): Response {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details
        },
        meta: {
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || '1.0.0'
        }
    });
}
