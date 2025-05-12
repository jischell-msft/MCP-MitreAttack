import { WorkflowContext } from './types';

/**
 * Calculates the progress of a workflow execution as a percentage
 */
export function calculateWorkflowProgress(context: WorkflowContext, taskOrder: string[]): number {
    if (context.status === 'completed') {
        return 100;
    }

    if (context.status === 'pending' || !context.currentTask) {
        return 0;
    }

    const currentTaskIndex = taskOrder.findIndex(task => task === context.currentTask);
    if (currentTaskIndex === -1) {
        return 0;
    }

    // Count completed tasks (those present in results)
    const completedTaskCount = taskOrder
        .slice(0, currentTaskIndex)
        .filter(task => context.results[task])
        .length;

    // Current task is in progress
    const currentTaskProgress = 0.5; // Assume 50% for current task

    return Math.floor(((completedTaskCount + currentTaskProgress) / taskOrder.length) * 100);
}

/**
 * Gets the estimated time remaining for a workflow execution
 */
export function getEstimatedTimeRemaining(
    context: WorkflowContext,
    taskOrder: string[],
    taskDurations: Record<string, number>
): number {
    if (context.status === 'completed' || context.status === 'failed' || context.status === 'canceled') {
        return 0;
    }

    // Calculate time elapsed so far
    const timeElapsedMs = Date.now() - context.startTime.getTime();

    // If no current task or pending status, use estimated total time
    if (context.status === 'pending' || !context.currentTask) {
        return estimateTotalTime(taskOrder, taskDurations);
    }

    // Find current task index
    const currentTaskIndex = taskOrder.findIndex(task => task === context.currentTask);
    if (currentTaskIndex === -1) {
        return estimateTotalTime(taskOrder, taskDurations);
    }

    // Estimate time remaining for current and future tasks
    let timeRemainingMs = 0;

    // Add estimated time for current task
    const currentTaskDuration = taskDurations[context.currentTask] || 30000; // Default 30s
    timeRemainingMs += currentTaskDuration / 2; // Assume current task is half done

    // Add estimated time for remaining tasks
    for (let i = currentTaskIndex + 1; i < taskOrder.length; i++) {
        timeRemainingMs += taskDurations[taskOrder[i]] || 30000; // Default 30s
    }

    return timeRemainingMs;
}

/**
 * Estimates the total workflow execution time based on average task durations
 */
function estimateTotalTime(taskOrder: string[], taskDurations: Record<string, number>): number {
    return taskOrder.reduce((total, task) => {
        return total + (taskDurations[task] || 30000); // Default 30s
    }, 0);
}

/**
 * Maps a workflow status to a more user-friendly format
 */
export function formatWorkflowStatus(
    context: WorkflowContext,
    taskOrder: string[]
): any {
    const elapsedTimeMs = Date.now() - context.startTime.getTime();
    const progress = calculateWorkflowProgress(context, taskOrder);

    return {
        id: context.workflowId,
        status: context.status,
        progress,
        currentTask: context.currentTask,
        elapsedTimeMs,
        startTime: context.startTime,
        results: context.status === 'completed' ? context.results : undefined,
        error: context.status === 'failed' ? getWorkflowError(context) : undefined
    };
}

/**
 * Gets the error information from a workflow context
 */
function getWorkflowError(context: WorkflowContext): any {
    // If we have a specific task error, return that
    if (context.currentTask && context.errors[context.currentTask]) {
        const error = context.errors[context.currentTask];
        return {
            task: context.currentTask,
            message: error.message,
            stack: error.stack
        };
    }

    // Otherwise return a generic error
    return {
        message: 'Workflow execution failed',
        tasks: Object.keys(context.errors)
    };
}
