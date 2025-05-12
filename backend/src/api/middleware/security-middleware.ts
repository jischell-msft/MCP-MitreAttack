import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '../errors/api-error';
import { CORS_CONFIG } from '../../config';

/**
 * Configure helmet for security headers
 */
export const helmetMiddleware = helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
});

/**
 * Apply rate limiting
 */
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later',
    handler: (req: Request, res: Response, next: NextFunction) => {
        next(new TooManyRequestsError('Too many requests', 15 * 60));
    },
    skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    }
});

/**
 * Implements CORS configuration
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Set CORS headers
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && CORS_CONFIG.origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (CORS_CONFIG.origins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.methods);
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    next();
}
