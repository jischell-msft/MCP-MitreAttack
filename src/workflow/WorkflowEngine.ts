import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/Database';
import { Logger } from '../utils/Logger';
import { WorkflowDefinition, WorkflowContext, TaskDefinition, WorkflowError } from './types';

/**
 * Engine for executing and managing workflows
 */
export class WorkflowEngine {
    private definitions: Map<string, WorkflowDefinition> = new Map();
    private db: Database;
    private logger: Logger;

    /**
     * Creates a new workflow engine instance
     */
    constructor(db: Database, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Registers a workflow definition with the engine
     */
    public registerWorkflow(definition: WorkflowDefinition): void {
        // Validate workflow definition
        this.validateWorkflowDefinition(definition);

        this.definitions.set(definition.id, definition);

        this.logger.info(`Registered workflow: ${definition.id}`, {
            workflowId: definition.id,
            name: definition.name,
            taskCount: definition.tasks.length
        });
    }

    /**
     * Executes a workflow with the given input
     */
    public async executeWorkflow(
        workflowId: string,
        input: any
    ): Promise<WorkflowContext> {
        const definition = this.definitions.get(workflowId);
        if (!definition) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        // Create workflow context
        const context: WorkflowContext = {
            workflowId: uuidv4(),
            startTime: new Date(),
            status: 'pending',
            currentTask: null,
            results: {},
            errors: {},
            metadata: { input, workflowType: workflowId }
        };

        // Persist initial context
        await this.saveContext(context);

        try {
            // Set status to running
            context.status = 'running';
            await this.saveContext(context);

            this.logger.info(`Starting workflow: ${definition.name}`, {
                workflowId: context.workflowId,
                workflowType: workflowId
            });

            // Build execution plan based on dependencies
            const executionPlan = this.createExecutionPlan(definition);

            // Execute tasks according to the execution plan
            for (const taskName of executionPlan) {
                const task = definition.tasks.find(t => t.name === taskName);
                if (!task) {
                    throw new WorkflowError(
                        `Task not found in workflow definition: ${taskName}`,
                        context.workflowId
                    );
                }

                await this.executeTask(task, context, definition);
            }

            // Set status to completed
            context.status = 'completed';
            context.currentTask = null;
            await this.saveContext(context);

            this.logger.info(`Workflow completed: ${definition.name}`, {
                workflowId: context.workflowId,
                executionTime: Date.now() - context.startTime.getTime(),
                workflowType: workflowId
            });

            return context;
        } catch (error) {
            // Workflow failed
            context.status = 'failed';
            await this.saveContext(context);

            this.logger.error(`Workflow failed: ${definition.name}`, {
                workflowId: context.workflowId,
                workflowType: workflowId,
                error: error.message,
                stack: error.stack
            });

            throw error instanceof WorkflowError
                ? error
                : new WorkflowError(`Workflow execution failed: ${error.message}`, context.workflowId, undefined, error);
        }
    }

    /**
     * Retrieves the current context of a workflow execution
     */
    public async getContext(workflowId: string): Promise<WorkflowContext | null> {
        const row = await this.db.get(
            `SELECT * FROM workflows WHERE id = ?`,
            [workflowId]
        );

        if (!row) {
            return null;
        }

        const data = JSON.parse(row.data);

        return {
            workflowId: row.id,
            startTime: new Date(row.created_at),
            status: row.status,
            currentTask: row.current_step,
            results: data.results || {},
            errors: Object.fromEntries(
                Object.entries(data.errors || {}).map(([k, v]) => [k, new Error(v.message)])
            ),
            metadata: data.metadata || {}
        };
    }

    /**
     * Cancels a running workflow
     */
    public async cancelWorkflow(workflowId: string): Promise<boolean> {
        const context = await this.getContext(workflowId);

        if (!context) {
            return false;
        }

        if (context.status !== 'running' && context.status !== 'pending') {
            return false;
        }

        context.status = 'canceled';
        await this.saveContext(context);

        this.logger.info(`Workflow canceled`, {
            workflowId
        });

        return true;
    }

    /**
     * Lists all workflows with optional status filter
     */
    public async listWorkflows(status?: string): Promise<WorkflowContext[]> {
        let query = `SELECT * FROM workflows`;
        const params: any[] = [];

        if (status) {
            query += ` WHERE status = ?`;
            params.push(status);
        }

        query += ` ORDER BY created_at DESC`;

        const rows = await this.db.all(query, params);

        return rows.map(row => {
            const data = JSON.parse(row.data);

            return {
                workflowId: row.id,
                startTime: new Date(row.created_at),
                status: row.status,
                currentTask: row.current_step,
                results: data.results || {},
                errors: Object.fromEntries(
                    Object.entries(data.errors || {}).map(([k, v]) => [k, new Error(v.message)])
                ),
                metadata: data.metadata || {}
            };
        });
    }

    /**
     * Validates a workflow definition for correctness
     */
    private validateWorkflowDefinition(definition: WorkflowDefinition): void {
        // Check for duplicate task names
        const taskNames = new Set<string>();
        for (const task of definition.tasks) {
            if (taskNames.has(task.name)) {
                throw new Error(`Duplicate task name in workflow definition: ${task.name}`);
            }
            taskNames.add(task.name);
        }

        // Check that all dependencies are valid tasks
        for (const [taskName, deps] of Object.entries(definition.dependencies)) {
            if (!taskNames.has(taskName)) {
                throw new Error(`Dependency defined for non-existent task: ${taskName}`);
            }

            for (const dep of deps) {
                if (!taskNames.has(dep)) {
                    throw new Error(`Task ${taskName} depends on non-existent task: ${dep}`);
                }
            }
        }

        // Check for circular dependencies
        this.detectCircularDependencies(definition);
    }

    /**
     * Creates an execution plan based on task dependencies
     */
    private createExecutionPlan(definition: WorkflowDefinition): string[] {
        const visited = new Set<string>();
        const executionPlan: string[] = [];

        function visit(taskName: string) {
            if (visited.has(taskName)) return;

            visited.add(taskName);

            // Visit all dependencies first
            const dependencies = definition.dependencies[taskName] || [];
            for (const dep of dependencies) {
                visit(dep);
            }

            executionPlan.push(taskName);
        }

        // Visit all tasks
        for (const task of definition.tasks) {
            visit(task.name);
        }

        return executionPlan;
    }

    /**
     * Detects circular dependencies in a workflow definition
     */
    private detectCircularDependencies(definition: WorkflowDefinition): void {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        function checkCycle(taskName: string): boolean {
            if (!visited.has(taskName)) {
                visited.add(taskName);
                recStack.add(taskName);

                const dependencies = definition.dependencies[taskName] || [];
                for (const dep of dependencies) {
                    if (!visited.has(dep) && checkCycle(dep)) {
                        return true;
                    } else if (recStack.has(dep)) {
                        throw new Error(`Circular dependency detected: ${dep} -> ${taskName}`);
                    }
                }
            }

            recStack.delete(taskName);
            return false;
        }

        // Check every task
        for (const task of definition.tasks) {
            if (!visited.has(task.name)) {
                checkCycle(task.name);
            }
        }
    }

    /**
     * Executes a single task within a workflow
     */
    private async executeTask(
        task: TaskDefinition,
        context: WorkflowContext,
        definition: WorkflowDefinition
    ): Promise<void> {
        context.currentTask = task.name;
        await this.saveContext(context);

        this.logger.info(`Starting task: ${task.name}`, {
            workflowId: context.workflowId,
            task: task.name
        });

        try {
            // Get input for the task
            const taskInput = this.getTaskInput(task, context, definition);

            // Validate input
            try {
                task.inputSchema.parse(taskInput);
            } catch (error) {
                throw new WorkflowError(
                    `Invalid input for task ${task.name}: ${error.message}`,
                    context.workflowId,
                    task.name,
                    error
                );
            }

            // Execute task with retries
            const result = await this.executeTaskWithRetries(task, context, taskInput);

            // Validate output
            try {
                task.outputSchema.parse(result);
            } catch (error) {
                throw new WorkflowError(
                    `Invalid output from task ${task.name}: ${error.message}`,
                    context.workflowId,
                    task.name,
                    error
                );
            }

            // Store result
            context.results[task.name] = result;
            await this.saveContext(context);

            this.logger.info(`Completed task: ${task.name}`, {
                workflowId: context.workflowId,
                task: task.name
            });
        } catch (error) {
            context.errors[task.name] = error;

            this.logger.error(`Task failed: ${task.name}`, {
                workflowId: context.workflowId,
                task: task.name,
                error: error.message,
                stack: error.stack
            });

            throw error instanceof WorkflowError
                ? error
                : new WorkflowError(`Task execution failed: ${error.message}`, context.workflowId, task.name, error);
        }
    }

    /**
     * Executes a task with retry logic
     */
    private async executeTaskWithRetries(
        task: TaskDefinition,
        context: WorkflowContext,
        input: any
    ): Promise<any> {
        let lastError: Error;

        for (let attempt = 0; attempt <= task.retries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.info(`Retrying task: ${task.name} (attempt ${attempt + 1}/${task.retries + 1})`, {
                        workflowId: context.workflowId,
                        task: task.name,
                        attempt: attempt + 1
                    });

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, task.retryDelay));
                }

                // Execute task with timeout
                return await Promise.race([
                    task.handler(context, input),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Task timed out after ${task.timeout}ms: ${task.name}`)),
                            task.timeout)
                    )
                ]);
            } catch (error) {
                lastError = error;

                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    this.logger.warn(`Non-retryable error in task ${task.name}`, {
                        workflowId: context.workflowId,
                        task: task.name,
                        error: error.message
                    });
                    break;
                }
            }
        }

        throw lastError;
    }

    /**
     * Determines if an error is retryable
     */
    private isRetryableError(error: Error): boolean {
        // Determine if the error is retryable
        const retryablePatterns = [
            'network',
            'timeout',
            'connection',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'socket hang up',
            'server responded with a 5', // 5xx errors
            'too many requests', // 429 errors
            'rate limit'
        ];

        if (error instanceof WorkflowError && error.cause) {
            error = error.cause;
        }

        const errorString = error.message.toLowerCase();
        return retryablePatterns.some(pattern => errorString.includes(pattern));
    }

    /**
     * Gets the input for a task based on workflow context
     */
    private getTaskInput(
        task: TaskDefinition,
        context: WorkflowContext,
        definition: WorkflowDefinition
    ): any {
        // Special case for the first task - use workflow input
        if (task.name === definition.tasks[0].name && !definition.dependencies[task.name]?.length) {
            return context.metadata.input;
        }

        // For tasks with dependencies, combine outputs from dependencies
        const dependencies = definition.dependencies[task.name] || [];
        if (dependencies.length === 0) {
            // No dependencies, use workflow input
            return context.metadata.input;
        } else if (dependencies.length === 1) {
            // Single dependency, use its output directly
            return context.results[dependencies[0]];
        } else {
            // Multiple dependencies, combine their outputs
            return dependencies.reduce((combined, dep) => {
                return { ...combined, [dep]: context.results[dep] };
            }, {});
        }
    }

    /**
     * Saves workflow context to the database
     */
    private async saveContext(context: WorkflowContext): Promise<void> {
        await this.db.run(
            `INSERT OR REPLACE INTO workflows 
       (id, type, status, created_at, updated_at, current_step, data) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                context.workflowId,
                context.metadata.workflowType || 'unknown',
                context.status,
                context.startTime.toISOString(),
                new Date().toISOString(),
                context.currentTask,
                JSON.stringify({
                    results: context.results,
                    errors: Object.fromEntries(
                        Object.entries(context.errors).map(([k, v]) => [k, {
                            message: v.message,
                            stack: v.stack
                        }])
                    ),
                    metadata: context.metadata
                })
            ]
        );
    }
}
