/**
 * Custom application error class
 */
export class ApplicationError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;

        // Ensures proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApplicationError);
        }
    }
}

/**
 * Error type for transient failures that can be retried
 */
export class TransientError extends ApplicationError {
    constructor(code: string, message: string, cause?: Error) {
        super(message, code);
        this.name = 'TransientError';
    }
}

/**
 * Error type for permanent failures that should not be retried
 */
export class PermanentError extends ApplicationError {
    constructor(code: string, message: string, cause?: Error) {
        super(message, code);
        this.name = 'PermanentError';
    }
}

/**
 * Error type for validation failures
 */
export class ValidationError extends ApplicationError {
    constructor(code: string, message: string, public details?: any) {
        super(message, code);
        this.name = 'ValidationError';
    }
}

/**
 * Error type for authentication failures
 */
export class AuthenticationError extends ApplicationError {
    constructor(message: string, cause?: Error) {
        super(message, 'AUTHENTICATION_FAILED');
        this.name = 'AuthenticationError';
    }
}

/**
 * Error type for authorization failures
 */
export class AuthorizationError extends ApplicationError {
    constructor(message: string, cause?: Error) {
        super(message, 'AUTHORIZATION_FAILED');
        this.name = 'AuthorizationError';
    }
}

/**
 * Error type for resource not found
 */
export class NotFoundError extends ApplicationError {
    constructor(resource: string, id: string, cause?: Error) {
        super(`${resource} with id ${id} not found`, 'RESOURCE_NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
