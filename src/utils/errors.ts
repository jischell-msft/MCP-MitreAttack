/**
 * Base application error class
 */
export class ApplicationError extends Error {
    constructor(
        public code: string,
        message: string,
        public cause?: Error
    ) {
        super(message);
        this.name = 'ApplicationError';

        // Preserve stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error type for transient failures that can be retried
 */
export class TransientError extends ApplicationError {
    constructor(code: string, message: string, cause?: Error) {
        super(code, message, cause);
        this.name = 'TransientError';
    }
}

/**
 * Error type for permanent failures that should not be retried
 */
export class PermanentError extends ApplicationError {
    constructor(code: string, message: string, cause?: Error) {
        super(code, message, cause);
        this.name = 'PermanentError';
    }
}

/**
 * Error type for validation failures
 */
export class ValidationError extends ApplicationError {
    constructor(code: string, message: string, public details?: any) {
        super(code, message);
        this.name = 'ValidationError';
    }
}

/**
 * Error type for authentication failures
 */
export class AuthenticationError extends ApplicationError {
    constructor(message: string, cause?: Error) {
        super('AUTHENTICATION_FAILED', message, cause);
        this.name = 'AuthenticationError';
    }
}

/**
 * Error type for authorization failures
 */
export class AuthorizationError extends ApplicationError {
    constructor(message: string, cause?: Error) {
        super('AUTHORIZATION_FAILED', message, cause);
        this.name = 'AuthorizationError';
    }
}

/**
 * Error type for resource not found
 */
export class NotFoundError extends ApplicationError {
    constructor(resource: string, id: string, cause?: Error) {
        super('RESOURCE_NOT_FOUND', `${resource} with id ${id} not found`, cause);
        this.name = 'NotFoundError';
    }
}
