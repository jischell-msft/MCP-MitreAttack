import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger, { logRequest } from '../utils/logger';

// Add request ID and timing middleware
export const requestLogger = (req: Request & { id?: string }, res: Response, next: NextFunction) => {
    // Add correlation ID to request
    req.id = (req.headers['x-request-id'] as string) || uuidv4();
    res.setHeader('X-Request-ID', req.id);

    // Log request
    logger.http(`${req.method} ${req.originalUrl}`, {
        ...logRequest(req),
        requestId: req.id,
    });

    // Record start time
    const start = Date.now();

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'http';

        logger.log(logLevel, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            requestId: req.id,
        });
    });

    next();
};

// Error logging middleware
export const errorLogger = (err: any, req: Request & { id?: string }, res: Response, next: NextFunction) => {
    logger.error(`Error processing request: ${err.message}`, {
        error: {
            message: err.message,
            stack: err.stack,
            status: err.status || 500,
            code: err.code,
        },
        request: logRequest(req),
        requestId: req.id,
    });

    next(err);
};
