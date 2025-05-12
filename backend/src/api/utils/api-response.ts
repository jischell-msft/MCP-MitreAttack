import { Response } from 'express';

/**
 * API Response interface
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
        timestamp: string;
        version: string;
    };
}

/**
 * Send a success response
 */
export function sendSuccess<T>(
    res: Response,
    data: T,
    meta: Partial<Omit<ApiResponse<T>['meta'], 'timestamp'>> = {},
    statusCode = 200
): Response {
    return res.status(statusCode).json({
        success: true,
        data,
        meta: {
            ...meta,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0'
        }
    });
}

/**
 * Send a paginated success response
 */
export function sendPaginatedSuccess<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    additionalMeta: Record<string, any> = {},
    statusCode = 200
): Response {
    const pages = Math.ceil(total / limit) || 1;

    return sendSuccess(
        res,
        data,
        {
            pagination: {
                page,
                limit,
                total,
                pages
            },
            ...additionalMeta
        },
        statusCode
    );
}

/**
 * Send an error response
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
            ...(details ? { details } : {})
        },
        meta: {
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0'
        }
    });
}
