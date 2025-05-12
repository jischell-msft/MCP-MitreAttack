/**
 * Base API Error class
 */
export class ApiError extends Error {
    code: string;
    statusCode: number;
    details?: any;

    constructor(message: string, code: string, statusCode = 500, details?: any) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

/**
 * Error for invalid requests
 */
export class ValidationError extends ApiError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends ApiError {
    constructor(resource: string, id?: string) {
        super(
            id ? `${resource} with ID ${id} not found` : `${resource} not found`,
            'NOT_FOUND',
            404
        );
    }
}

/**
 * Error for unauthorized requests
 */
export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized access') {
        super(message, 'UNAUTHORIZED', 401);
    }
}

/**
 * Error for forbidden requests
 */
export class ForbiddenError extends ApiError {
    constructor(message = 'Access forbidden') {
        super(message, 'FORBIDDEN', 403);
    }
}

/**
 * Error for conflict in resource state
 */
export class ConflictError extends ApiError {
    constructor(message: string) {
        super(message, 'CONFLICT', 409);
    }
}

/**
 * Error for server errors
 */
export class ServerError extends ApiError {
    constructor(message = 'Internal server error', details?: any) {
        super(message, 'SERVER_ERROR', 500, details);
    }
}

/**
 * Error for too many requests
 */
export class TooManyRequestsError extends ApiError {
    constructor(message = 'Too many requests', retryAfterSeconds?: number) {
        super(message, 'TOO_MANY_REQUESTS', 429, { retryAfterSeconds });
    }
}
