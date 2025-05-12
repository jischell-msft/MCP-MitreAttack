import { Logger } from '../utils/logger';
import { WorkflowContext } from './types';
import { ApplicationError, TransientError } from '../utils/errors';

const logger = new Logger('WorkflowErrorHandler');

/**
 * Handles workflow errors and updates the workflow context accordingly
 * @param error The error that occurred
 * @param context The workflow context
 */
export function handleWorkflowError(error: Error, context: WorkflowContext): void {
    // Log the error
    logger.error(`Workflow error in task "${context.currentTask}"`, {
        workflowId: context.workflowId,
        task: context.currentTask,
        error: error.message,
        stack: error.stack,
        errorType: error.name
    });

    // Store error in workflow context
    if (context.currentTask) {
        context.errors[context.currentTask] = error;
    }

    // Set workflow status based on error type
    if (error instanceof TransientError) {
        // Transient errors can be retried
        context.status = 'pending';

        // Record retry attempt in metadata
        context.metadata.retryAttempts = (context.metadata.retryAttempts || 0) + 1;
        context.metadata.lastRetryError = error.message;

        // If too many retries, fail the workflow
        if (context.metadata.retryAttempts > 3) {
            context.status = 'failed';
            context.metadata.failureReason = 'Max retry attempts exceeded';
            context.metadata.errorCode = 'MAX_RETRIES_EXCEEDED';
        }
    } else {
        // Permanent errors cause workflow failure
        context.status = 'failed';
        context.metadata.failureReason = error.message;

        if (error instanceof ApplicationError) {
            context.metadata.errorCode = error.code;
        } else {
            context.metadata.errorCode = 'UNKNOWN_ERROR';
        }
    }

    // Add error timestamp
    context.metadata.errorTimestamp = new Date().toISOString();
}

/**
 * Creates a recoverable error handler that will attempt to recover from specific errors
 * @param recoveryMap Map of error codes to recovery functions
 */
export function createRecoverableErrorHandler(
    recoveryMap: Record<string, (context: WorkflowContext, error: ApplicationError) => Promise<void>>
) {
    return async (error: Error, context: WorkflowContext): Promise<boolean> => {
        if (!(error instanceof ApplicationError)) {
            return false;
        }

        const recoveryFn = recoveryMap[error.code];
        if (!recoveryFn) {
            return false;
        }

        try {
            await recoveryFn(context, error);
            return true;
        } catch (recoveryError) {
            logger.error(`Recovery failed for error ${error.code}`, {
                workflowId: context.workflowId,
                originalError: error.message,
                recoveryError: recoveryError.message
            });

            return false;
        }
    };
}
