import { z } from 'zod';

/**
 * Definition of a single task in a workflow
 */
export interface TaskDefinition<TInput = any, TOutput = any> {
    /** Unique name of the task */
    name: string;

    /** Function that executes the task */
    handler: (context: WorkflowContext, input: TInput) => Promise<TOutput>;

    /** Schema for validating task input */
    inputSchema: z.ZodType<TInput>;

    /** Schema for validating task output */
    outputSchema: z.ZodType<TOutput>;

    /** Timeout in milliseconds */
    timeout: number;

    /** Number of retry attempts */
    retries: number;

    /** Delay between retries in milliseconds */
    retryDelay: number;
}

/**
 * Definition of a complete workflow
 */
export interface WorkflowDefinition {
    /** Unique identifier for the workflow */
    id: string;

    /** Human-readable name of the workflow */
    name: string;

    /** Description of what the workflow does */
    description: string;

    /** List of tasks that make up this workflow */
    tasks: TaskDefinition[];

    /** Task dependencies (task name -> array of dependency task names) */
    dependencies: Record<string, string[]>;
}

/**
 * Status of a workflow execution
 */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

/**
 * Context for a workflow execution
 */
export interface WorkflowContext {
    /** Unique identifier for this workflow execution */
    workflowId: string;

    /** Time when the workflow started */
    startTime: Date;

    /** Current status of the workflow */
    status: WorkflowStatus;

    /** Current executing task name (or null if not running a task) */
    currentTask: string | null;

    /** Results of completed tasks (task name -> result) */
    results: Record<string, any>;

    /** Errors encountered during task execution (task name -> error) */
    errors: Record<string, Error>;

    /** Custom metadata for this workflow execution */
    metadata: Record<string, any>;
}

/**
 * Error thrown when a workflow operation fails
 */
export class WorkflowError extends Error {
    constructor(
        message: string,
        public readonly workflowId: string,
        public readonly taskName?: string,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'WorkflowError';
    }
}
