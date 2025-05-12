# Basic Taskt Integration

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on integrating Taskt, a lightweight workflow orchestration library, to coordinate the execution of all agents in a structured workflow. This will provide a foundation for the complete workflow integration in the next step.

## Requirements
- Set up the Taskt workflow framework
- Define tasks for each agent
- Implement context passing between tasks
- Create the initial workflow pipeline
- Add basic error handling and logging

## Tasks

### 3.1.1. Set up Taskt library integration
- Install Taskt library
- Configure Taskt for the project
- Set up basic workflow engine
- Create workflow storage utilities

### 3.1.2. Create task definitions for each agent
- Define FetchAgent task
- Define ParseAgent task
- Define DocIngestAgent task
- Define EvalAgent task
- Define ReportAgent task

### 3.1.3. Implement basic workflow sequence
- Create sequential workflow definition
- Define task order and dependencies
- Implement workflow initialization
- Create workflow execution logic

### 3.1.4. Create context passing between tasks
- Implement task input/output mapping
- Create workflow context model
- Add context validation
- Implement context persistence

### 3.1.5. Add basic error handling
- Implement task-level error catching
- Create workflow-level error handling
- Add retry logic for transient errors
- Implement error reporting

### 3.1.6. Implement workflow state persistence
- Create database storage for workflow state
- Implement checkpoint mechanism
- Add workflow resumption capabilities
- Create workflow history logging

### 3.1.7. Create workflow logging
- Implement structured logging for tasks
- Add performance metrics collection
- Create workflow audit trail
- Implement log rotation and storage

### 3.1.8. Test basic workflow execution
- Create test cases for workflows
- Implement integration tests
- Add workflow validation
- Create test fixtures for each agent

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces and types
- Create a clean separation between task definitions and execution
- Implement proper error handling and recovery
- Add detailed logging throughout the workflow
- Design for both reliability and performance
- Support future extensibility

Start by setting up the Taskt library and creating task definitions. Then implement the basic workflow sequence with context passing. Finally, add error handling, state persistence, and logging.

## Workflow Definition

Here's a suggested structure for defining workflows:

```typescript
interface TaskDefinition {
  name: string;
  handler: (context: WorkflowContext, input: any) => Promise<any>;
  inputSchema: Schema;  // Zod schema or similar
  outputSchema: Schema;
  timeout: number;      // Timeout in milliseconds
  retries: number;      // Number of retry attempts
  retryDelay: number;   // Delay between retries in milliseconds
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  tasks: TaskDefinition[];
  dependencies: Record<string, string[]>;  // task -> dependencies
}

interface WorkflowContext {
  workflowId: string;
  startTime: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentTask: string | null;
  results: Record<string, any>;  // task -> result
  errors: Record<string, Error>;  // task -> error
  metadata: Record<string, any>;  // Custom metadata
}
```

## Workflow Implementation

Create a workflow engine that executes tasks in the correct order:

```typescript
class WorkflowEngine {
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private db: Database;
  private logger: Logger;

  constructor(db: Database, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  registerWorkflow(definition: WorkflowDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  async executeWorkflow(
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
      metadata: { input }
    };

    // Persist initial context
    await this.saveContext(context);

    try {
      // Set status to running
      context.status = 'running';
      await this.saveContext(context);

      // Execute tasks in order (simplified - doesn't handle dependencies)
      for (const task of definition.tasks) {
        context.currentTask = task.name;
        await this.saveContext(context);

        this.logger.info(`Starting task: ${task.name}`, {
          workflowId: context.workflowId,
          task: task.name
        });

        try {
          // Get input for the task
          const taskInput = this.getTaskInput(task, context);

          // Validate input
          task.inputSchema.parse(taskInput);

          // Execute task with retries
          const result = await this.executeTaskWithRetries(task, context, taskInput);

          // Validate output
          task.outputSchema.parse(result);

          // Store result
          context.results[task.name] = result;
          await this.saveContext(context);

          this.logger.info(`Completed task: ${task.name}`, {
            workflowId: context.workflowId,
            task: task.name
          });
        } catch (error) {
          context.errors[task.name] = error;
          context.status = 'failed';
          await this.saveContext(context);

          this.logger.error(`Task failed: ${task.name}`, {
            workflowId: context.workflowId,
            task: task.name,
            error: error.message,
            stack: error.stack
          });

          throw error;
        }
      }

      // Set status to completed
      context.status = 'completed';
      context.currentTask = null;
      await this.saveContext(context);

      this.logger.info(`Workflow completed`, {
        workflowId: context.workflowId,
        executionTime: Date.now() - context.startTime.getTime()
      });

      return context;
    } catch (error) {
      // Workflow failed
      context.status = 'failed';
      await this.saveContext(context);

      this.logger.error(`Workflow failed`, {
        workflowId: context.workflowId,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

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
            task: task.name
          });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, task.retryDelay));
        }
        
        // Execute task with timeout
        return await Promise.race([
          task.handler(context, input),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Task timed out: ${task.name}`)), task.timeout)
          )
        ]);
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }
      }
    }
    
    throw lastError;
  }

  private isRetryableError(error: Error): boolean {
    // Determine if the error is retryable
    // For example, network errors are retryable, but validation errors are not
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('connection');
  }

  private getTaskInput(task: TaskDefinition, context: WorkflowContext): any {
    // Simplified - in reality, would use the dependency graph
    // to determine which task outputs to use as input
    if (task.name === definition.tasks[0].name) {
      // First task - use workflow input
      return context.metadata.input;
    } else {
      // Other tasks - use result of previous task
      const prevTaskIdx = definition.tasks.findIndex(t => t.name === task.name) - 1;
      if (prevTaskIdx >= 0) {
        const prevTask = definition.tasks[prevTaskIdx];
        return context.results[prevTask.name];
      }
    }
    
    return {};
  }

  private async saveContext(context: WorkflowContext): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO workflows 
       (id, status, created_at, updated_at, current_step, data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        context.workflowId,
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

  async getContext(workflowId: string): Promise<WorkflowContext | null> {
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
}
```

## Task Definition Example

Here's how to define the tasks for each agent:

```typescript
// FetchAgent task
const fetchTask: TaskDefinition = {
  name: 'fetch',
  handler: async (context, input) => {
    const fetchAgent = new FetchAgent();
    await fetchAgent.initialize();
    
    return await fetchAgent.fetch();
  },
  inputSchema: z.object({}),  // No input needed
  outputSchema: z.object({
    mitreData: z.object({}),
    version: z.string(),
    timestamp: z.date(),
    source: z.string(),
    changeDetected: z.boolean()
  }),
  timeout: 60000,  // 1 minute
  retries: 3,
  retryDelay: 5000  // 5 seconds
};

// ParseAgent task
const parseTask: TaskDefinition = {
  name: 'parse',
  handler: async (context, input) => {
    const parseAgent = new ParseAgent();
    await parseAgent.initialize();
    
    return await parseAgent.parse(input.mitreData);
  },
  inputSchema: z.object({
    mitreData: z.object({}),
    version: z.string(),
    timestamp: z.date(),
    source: z.string(),
    changeDetected: z.boolean()
  }),
  outputSchema: z.object({
    techniques: z.array(z.object({
      id: z.string(),
      name: z.string(),
      // ... other technique fields
    })),
    techniqueIndex: z.map(z.string(), z.any()),
    tacticMap: z.map(z.string(), z.array(z.string())),
    version: z.string()
  }),
  timeout: 30000,  // 30 seconds
  retries: 2,
  retryDelay: 2000  // 2 seconds
};

// Similar definitions for other agents...
```

## Workflow Definition Example

Here's how to define the complete workflow:

```typescript
const analysisWorkflow: WorkflowDefinition = {
  id: 'document-analysis',
  name: 'Document Analysis Workflow',
  description: 'Analyzes a document against the MITRE ATT&CK framework',
  tasks: [fetchTask, parseTask, ingestTask, evalTask, reportTask],
  dependencies: {
    'fetch': [],
    'parse': ['fetch'],
    'ingest': [],
    'eval': ['parse', 'ingest'],
    'report': ['eval']
  }
};

// Register the workflow
workflowEngine.registerWorkflow(analysisWorkflow);

// Execute the workflow
const result = await workflowEngine.executeWorkflow('document-analysis', {
  url: 'https://example.com/document.pdf'
});
```
