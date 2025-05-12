# Complete Workflow Integration

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. In the previous step, we set up the basic Taskt workflow framework. This step focuses on integrating all agents into a complete workflow with comprehensive error handling, logging, and transaction management.

## Requirements
- Connect all agents in a coordinated workflow
- Implement comprehensive error handling
- Add detailed logging throughout the pipeline
- Create transaction boundaries for data consistency
- Support both URL analysis and document upload workflows

## Tasks

### 3.2.1. Connect FetchAgent to workflow
- Integrate FetchAgent task with workflow
- Implement proper input/output mapping
- Add error handling specific to MITRE data retrieval
- Create caching and versioning logic

### 3.2.2. Connect ParseAgent to workflow
- Integrate ParseAgent task with workflow
- Implement dependency on FetchAgent
- Add error handling for parsing failures
- Create efficient data passing between tasks

### 3.2.3. Connect DocIngestAgent to workflow
- Integrate DocIngestAgent task with workflow
- Implement handling for URLs and file uploads
- Add error handling for extraction failures
- Create context management for document data

### 3.2.4. Connect EvalAgent to workflow
- Integrate EvalAgent task with workflow
- Implement dependencies on ParseAgent and DocIngestAgent
- Add error handling for evaluation failures
- Create adaptive processing for large documents

### 3.2.5. Connect ReportAgent to workflow
- Integrate ReportAgent task with workflow
- Implement dependency on EvalAgent
- Add error handling for report generation
- Create transaction management for report storage

### 3.2.6. Implement comprehensive error handling
- Create error categorization system
- Implement error recovery strategies
- Add user-friendly error messages
- Create detailed error logging

### 3.2.7. Create transaction boundaries
- Implement atomic operations
- Add database transaction management
- Create rollback mechanisms
- Implement idempotent operations

### 3.2.8. Test complete workflow with sample documents
- Create end-to-end tests
- Test with various document types
- Verify error handling and recovery
- Test performance with large documents

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces and types
- Create clean boundaries between tasks
- Implement proper error handling with recovery strategies
- Add detailed logging with correlation IDs
- Design for both reliability and performance
- Support future extensibility

Start by integrating each agent into the workflow one by one, testing thoroughly at each step. Then implement comprehensive error handling and transaction management. Finally, test the complete workflow with various document types and edge cases.

## Workflow Types

Implement support for multiple workflow types:

1. **URL Analysis Workflow**:
   - Input: URL to analyze
   - Process: Fetch URL content, extract text, evaluate against MITRE
   - Output: Analysis report

2. **Document Upload Workflow**:
   - Input: Uploaded document (PDF, DOCX, etc.)
   - Process: Extract text, evaluate against MITRE
   - Output: Analysis report

3. **MITRE Update Workflow**:
   - Input: None (triggered on schedule)
   - Process: Fetch latest MITRE data, parse and update database
   - Output: Updated MITRE database

4. **Re-evaluation Workflow**:
   - Input: Previous document analysis ID
   - Process: Retrieve document, evaluate against latest MITRE data
   - Output: Updated analysis report

## Complete Workflow Implementation

Implement the full document analysis workflow:

```typescript
// Create document analysis workflow
const documentAnalysisWorkflow: WorkflowDefinition = {
  id: 'document-analysis',
  name: 'Document Analysis Workflow',
  description: 'Analyzes a document against the MITRE ATT&CK framework',
  tasks: [
    // Dynamic task - either URL fetch or document upload handling
    {
      name: 'prepare-document',
      handler: async (context, input) => {
        // Determine input type and route to appropriate handler
        if (input.url) {
          return await handleUrlInput(input.url, context);
        } else if (input.documentPath) {
          return await handleDocumentInput(input.documentPath, input.documentName, context);
        } else {
          throw new Error('Invalid input: requires either url or documentPath');
        }
      },
      inputSchema: z.object({
        url: z.string().url().optional(),
        documentPath: z.string().optional(),
        documentName: z.string().optional()
      }).refine(data => data.url || (data.documentPath && data.documentName), {
        message: "Either URL or document path with name must be provided"
      }),
      outputSchema: z.object({
        documentContent: z.string(),
        documentChunks: z.array(z.string()).optional(),
        documentMetadata: z.object({
          title: z.string().optional(),
          author: z.string().optional(),
          createdDate: z.date().optional(),
          pageCount: z.number().optional(),
          charCount: z.number(),
          format: z.string()
        }),
        sourceUrl: z.string().url().optional(),
        sourceFile: z.string().optional(),
      }),
      timeout: 120000, // 2 minutes
      retries: 2,
      retryDelay: 5000
    },
    
    // MITRE data fetch and parse (combined for efficiency)
    {
      name: 'get-mitre-data',
      handler: async (context, input) => {
        // Get the FetchAgent
        const fetchAgent = new FetchAgent({
          sourceUrl: config.mitreAttackUrl,
          cacheDir: config.mitreCacheDir,
          updateInterval: config.mitreUpdateInterval,
          maxRetries: 3,
          requestTimeout: 30000
        });
        
        await fetchAgent.initialize();
        
        // Fetch the MITRE data (using cache if available)
        const fetchResult = await fetchAgent.fetch();
        
        // Get the ParseAgent
        const parseAgent = new ParseAgent({
          includeSubtechniques: true,
          includeTactics: true,
          includeDataSources: true,
          extractKeywords: true
        });
        
        await parseAgent.initialize();
        
        // Parse the MITRE data
        const parseResult = await parseAgent.parse(fetchResult.mitreData);
        
        return {
          techniques: parseResult.techniques,
          techniqueIndex: parseResult.techniqueIndex,
          version: fetchResult.version,
          timestamp: fetchResult.timestamp
        };
      },
      inputSchema: z.object({}), // No input needed
      outputSchema: z.object({
        techniques: z.array(z.object({
          id: z.string(),
          name: z.string(),
          // Other technique fields
        })),
        techniqueIndex: z.any(), // Map isn't directly validatable with zod
        version: z.string(),
        timestamp: z.date()
      }),
      timeout: 60000, // 1 minute
      retries: 3,
      retryDelay: 5000
    },
    
    // Document evaluation
    {
      name: 'evaluate-document',
      handler: async (context, input) => {
        // Get document content from prepare-document task
        const documentData = context.results['prepare-document'];
        
        // Get MITRE data from get-mitre-data task
        const mitreData = context.results['get-mitre-data'];
        
        // Initialize EvalAgent
        const evalAgent = new EvalAgent({
          minConfidenceScore: 65,
          maxMatches: 100,
          contextWindowSize: 200,
          useKeywordMatching: true,
          useTfIdfMatching: true,
          useFuzzyMatching: true,
          azureOpenAI: {
            useAzureOpenAI: true,
            endpoint: config.azureOpenAI.endpoint,
            apiKey: config.azureOpenAI.apiKey,
            deploymentName: config.azureOpenAI.deploymentName,
            apiVersion: config.azureOpenAI.apiVersion,
            maxTokens: config.azureOpenAI.maxTokens,
            temperature: config.azureOpenAI.temperature,
            timeout: config.azureOpenAI.timeout,
            retryCount: config.azureOpenAI.retryCount
          }
        });
        
        await evalAgent.initialize(mitreData.techniques);
        
        // If document is chunked, process each chunk and merge results
        if (documentData.documentChunks && documentData.documentChunks.length > 0) {
          const chunkResults = [];
          
          for (const chunk of documentData.documentChunks) {
            const result = await evalAgent.evaluateChunk(chunk);
            chunkResults.push(result);
          }
          
          // Merge results from all chunks
          return mergeEvalResults(chunkResults, documentData);
        } else {
          // Process entire document at once
          return await evalAgent.evaluate(documentData.documentContent);
        }
      },
      inputSchema: z.object({}), // Inputs come from context
      outputSchema: z.object({
        matches: z.array(z.object({
          techniqueId: z.string(),
          techniqueName: z.string(), 
          confidenceScore: z.number(),
          matchedText: z.string(),
          context: z.string(),
          textPosition: z.object({
            startChar: z.number(),
            endChar: z.number()
          }),
          matchSource: z.string()
        })),
        summary: z.object({
          documentId: z.string(),
          matchCount: z.number(),
          topTechniques: z.array(z.string()),
          tacticsCoverage: z.record(z.string(), z.number()),
          azureOpenAIUsed: z.boolean(),
          processingTimeMs: z.number()
        })
      }),
      timeout: 300000, // 5 minutes
      retries: 2,
      retryDelay: 10000
    },
    
    // Generate and store report
    {
      name: 'generate-report',
      handler: async (context, input) => {
        // Get document data
        const documentData = context.results['prepare-document'];
        
        // Get evaluation results
        const evalResults = context.results['evaluate-document'];
        
        // Get MITRE version
        const mitreData = context.results['get-mitre-data'];
        
        // Initialize ReportAgent
        const reportAgent = new ReportAgent({
          defaultFormat: 'json',
          includeRawMatches: true,
          maxMatchesInSummary: 10,
          confidenceThreshold: 75,
          includeTacticBreakdown: true
        });
        
        await reportAgent.initialize();
        
        // Create document info for report
        const documentInfo = {
          url: documentData.sourceUrl,
          filename: documentData.sourceFile,
          metadata: documentData.documentMetadata
        };
        
        // Generate the report
        const report = await reportAgent.generateReport(evalResults, documentInfo);
        
        // Add MITRE version information
        report.mitreDatabaseVersion = mitreData.version;
        
        // Save the report to database
        const reportId = await reportAgent.saveReport(report);
        
        return {
          reportId,
          report
        };
      },
      inputSchema: z.object({}), // Inputs come from context
      outputSchema: z.object({
        reportId: z.string(),
        report: z.object({
          id: z.string(),
          timestamp: z.date(),
          source: z.object({
            url: z.string().optional(),
            filename: z.string().optional(),
            metadata: z.object({}).passthrough()
          }),
          summary: z.object({
            matchCount: z.number(),
            highConfidenceCount: z.number(),
            tacticsBreakdown: z.record(z.string(), z.number()),
            topTechniques: z.array(z.object({
              id: z.string(),
              name: z.string(),
              score: z.number()
            })),
            keyFindings: z.array(z.string())
          }),
          detailedMatches: z.array(z.object({
            techniqueId: z.string(),
            techniqueName: z.string(),
            confidenceScore: z.number(),
            matchedText: z.string(),
            context: z.string(),
            textPosition: z.object({
              startChar: z.number(),
              endChar: z.number()
            })
          })),
          mitreDatabaseVersion: z.string()
        })
      }),
      timeout: 60000, // 1 minute
      retries: 2,
      retryDelay: 5000
    }
  ],
  dependencies: {
    'prepare-document': [],
    'get-mitre-data': [],
    'evaluate-document': ['prepare-document', 'get-mitre-data'],
    'generate-report': ['evaluate-document']
  }
};
```

## URL and Document Handlers

Implement the handlers for different input types:

```typescript
async function handleUrlInput(url: string, context: WorkflowContext): Promise<any> {
  // Initialize DocIngestAgent
  const ingestAgent = new DocIngestAgent({
    maxDocumentSize: 50 * 1024 * 1024, // 50MB
    maxChunkSize: 10000,
    chunkOverlap: 1000,
    userAgent: 'MCP/1.0',
    timeout: 30000,
    retries: 3,
    followRedirects: true
  });

  await ingestAgent.initialize();
  
  try {
    // Process URL
    const result = await ingestAgent.processUrl(url);
    
    // Add workflow metadata
    context.metadata.sourceUrl = url;
    context.metadata.documentFormat = result.format;
    
    return {
      documentContent: result.extractedText,
      documentChunks: result.textChunks,
      documentMetadata: result.metadata,
      sourceUrl: result.sourceUrl,
      sourceFile: null
    };
  } catch (error) {
    logger.error(`Error processing URL: ${url}`, {
      workflowId: context.workflowId,
      error: error.message,
      url
    });
    
    throw new ApplicationError('URL_PROCESSING_FAILED', `Failed to process URL: ${error.message}`, error);
  }
}

async function handleDocumentInput(
  filePath: string, 
  fileName: string, 
  context: WorkflowContext
): Promise<any> {
  // Initialize DocIngestAgent
  const ingestAgent = new DocIngestAgent({
    maxDocumentSize: 50 * 1024 * 1024, // 50MB
    maxChunkSize: 10000,
    chunkOverlap: 1000,
    userAgent: 'MCP/1.0',
    timeout: 30000,
    retries: 3,
    followRedirects: true
  });

  await ingestAgent.initialize();
  
  try {
    // Process document file
    const result = await ingestAgent.processFile(filePath, fileName);
    
    // Add workflow metadata
    context.metadata.documentName = fileName;
    context.metadata.documentFormat = result.format;
    
    return {
      documentContent: result.extractedText,
      documentChunks: result.textChunks,
      documentMetadata: result.metadata,
      sourceUrl: null,
      sourceFile: fileName
    };
  } catch (error) {
    logger.error(`Error processing document: ${fileName}`, {
      workflowId: context.workflowId,
      error: error.message,
      fileName
    });
    
    throw new ApplicationError('DOCUMENT_PROCESSING_FAILED', `Failed to process document: ${error.message}`, error);
  }
}
```

## Error Handling Strategy

Implement a comprehensive error handling strategy:

```typescript
// Custom error classes
class ApplicationError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

class TransientError extends ApplicationError {
  constructor(code: string, message: string, cause?: Error) {
    super(code, message, cause);
    this.name = 'TransientError';
  }
}

class PermanentError extends ApplicationError {
  constructor(code: string, message: string, cause?: Error) {
    super(code, message, cause);
    this.name = 'PermanentError';
  }
}

// Error handler function
function handleWorkflowError(error: Error, context: WorkflowContext): void {
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
    }
  } else {
    // Permanent errors cause workflow failure
    context.status = 'failed';
    context.metadata.failureReason = error.message;
    
    if (error instanceof ApplicationError) {
      context.metadata.errorCode = error.code;
    }
  }
}
```

## Transaction Management

Implement transaction management for database operations:

```typescript
async function executeWithTransaction<T>(
  db: Database,
  operation: (db: Database) => Promise<T>
): Promise<T> {
  try {
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    // Execute the operation
    const result = await operation(db);
    
    // Commit transaction
    await db.run('COMMIT');
    
    return result;
  } catch (error) {
    // Rollback transaction on error
    try {
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction', {
        originalError: error.message,
        rollbackError: rollbackError.message
      });
    }
    
    throw error;
  }
}
```

## Workflow Testing Strategy

Implement a comprehensive testing strategy:

```typescript
// Integration test for the complete workflow
async function testDocumentAnalysisWorkflow(): Promise<void> {
  // Create test document with known MITRE techniques
  const testDocPath = await createTestDocument([
    'T1566', // Phishing
    'T1078', // Valid Accounts
    'T1486'  // Data Encrypted for Impact
  ]);
  
  try {
    // Initialize workflow engine
    const engine = new WorkflowEngine(db, logger);
    engine.registerWorkflow(documentAnalysisWorkflow);
    
    // Execute workflow
    const result = await engine.executeWorkflow('document-analysis', {
      documentPath: testDocPath,
      documentName: 'test-document.txt'
    });
    
    // Verify workflow completed successfully
    expect(result.status).toBe('completed');
    
    // Check for expected matches
    const reportResult = result.results['generate-report'];
    const matches = reportResult.report.detailedMatches;
    
    // Verify all expected techniques were found
    expect(matches.some(m => m.techniqueId === 'T1566')).toBe(true);
    expect(matches.some(m => m.techniqueId === 'T1078')).toBe(true);
    expect(matches.some(m => m.techniqueId === 'T1486')).toBe(true);
    
    // Check confidence scores
    const phishingMatch = matches.find(m => m.techniqueId === 'T1566');
    expect(phishingMatch?.confidenceScore).toBeGreaterThanOrEqual(70);
    
    // Verify report structure
    expect(reportResult.reportId).toBeDefined();
    expect(reportResult.report.summary.matchCount).toBeGreaterThanOrEqual(3);
    expect(reportResult.report.mitreDatabaseVersion).toBeDefined();
    
    console.log('Workflow test passed successfully');
  } catch (error) {
    console.error('Workflow test failed', error);
    throw error;
  } finally {
    // Clean up test document
    await fs.promises.unlink(testDocPath);
  }
}
```

        