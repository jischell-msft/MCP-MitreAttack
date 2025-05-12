# API Endpoint Development

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. In the previous steps, we've implemented the core agents and workflow system. Now we need to create the API endpoints that will allow clients to interact with the system, submit documents for analysis, and retrieve results.

## Requirements
- Create RESTful API endpoints for document submission
- Implement endpoints for report retrieval and management
- Add filtering, pagination, and sorting capabilities
- Implement proper error handling and response formatting
- Create comprehensive API documentation

## Tasks

### 3.3.1. Create URL submission endpoint
- Implement `/api/analyze` endpoint for URL submission
- Add request validation
- Create asynchronous processing
- Implement job status tracking

### 3.3.2. Implement document upload endpoint
- Extend `/api/analyze` endpoint for file uploads
- Add file validation and security checks
- Implement temporary file storage
- Create cleanup mechanism for processed files

### 3.3.3. Create report listing endpoint
- Implement `/api/reports` endpoint
- Add pagination support
- Implement filtering capabilities
- Create sorting options

### 3.3.4. Implement report detail endpoint
- Create `/api/reports/:id` endpoint
- Add detailed match retrieval
- Implement error handling for missing reports
- Create access control (if applicable)

### 3.3.5. Add filtering and pagination
- Implement query parameter parsing
- Create filter validation
- Add pagination metadata
- Implement efficient database queries

### 3.3.6. Implement proper error responses
- Create standardized error response format
- Map internal errors to HTTP status codes
- Add detailed error information
- Implement validation error formatting

### 3.3.7. Create API documentation
- Implement OpenAPI/Swagger documentation
- Add request/response examples
- Create endpoint descriptions
- Document error responses

### 3.3.8. Test all API endpoints
- Create integration tests for endpoints
- Test error cases and edge conditions
- Verify pagination and filtering
- Create performance tests

## Implementation Guidance

The implementation should:
- Follow RESTful API best practices
- Use TypeScript interfaces and types
- Implement proper request validation
- Add detailed error handling
- Include comprehensive logging
- Design for both reliability and performance

Start by creating the core submission endpoints, then implement report retrieval endpoints. Add filtering and pagination support, implement proper error responses, and finally create the API documentation.

## API Route Structure

Implement the following API endpoints:

```
/api
  /analyze
    POST / - Submit URL or document for analysis
    GET /:jobId - Check analysis status
  /reports
    GET / - List all reports (with filtering/pagination)
    GET /:id - Get specific report details
    DELETE /:id - Delete a report
    POST /export - Export reports
  /system
    GET /status - Get system status
    POST /update - Trigger ATT&CK database update
  /health - Health check endpoint
```

## URL Submission Endpoint

Implement the URL submission endpoint:

```typescript
// URL Submission endpoint
router.post('/analyze', async (req, res, next) => {
  try {
    // Validate request
    const schema = z.object({
      url: z.string().url().optional(),
      options: z.object({
        minConfidence: z.number().min(0).max(100).optional(),
        includeTactics: z.array(z.string()).optional(),
        maxResults: z.number().positive().optional()
      }).optional()
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: result.error.format()
        }
      });
    }
    
    const { url, options } = result.data;
    
    // Check if URL is provided
    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_URL',
          message: 'URL is required'
        }
      });
    }
    
    // Create a unique job ID
    const jobId = uuidv4();
    
    // Start workflow asynchronously
    startWorkflowAsync('document-analysis', {
      url,
      options
    }, jobId);
    
    // Return job ID for status checking
    return res.status(202).json({
      success: true,
      data: {
        jobId,
        status: 'submitted',
        message: 'Analysis job submitted successfully',
        statusUrl: `/api/analyze/${jobId}`
      }
    });
  } catch (error) {
    next(error);
  }
});

// Job status endpoint
router.get('/analyze/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    // Validate job ID format
    if (!isValidUuid(jobId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JOB_ID',
          message: 'Invalid job ID format'
        }
      });
    }
    
    // Get workflow status
    const workflowStatus = await getWorkflowStatus(jobId);
    
    if (!workflowStatus) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Analysis job not found'
        }
      });
    }
    
    // Map workflow status to API response
    const response = mapWorkflowStatusToResponse(workflowStatus);
    
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

function mapWorkflowStatusToResponse(workflowStatus: any): any {
  // Calculate progress percentage based on completed tasks
  const totalTasks = 4; // prepare-document, get-mitre-data, evaluate-document, generate-report
  let completedTasks = 0;
  
  if (workflowStatus.status === 'completed') {
    completedTasks = totalTasks;
  } else if (workflowStatus.status === 'running') {
    // Count completed tasks
    const taskMap: Record<string, boolean> = {
      'prepare-document': false,
      'get-mitre-data': false,
      'evaluate-document': false,
      'generate-report': false
    };
    
    // Mark current task as in progress
    if (workflowStatus.currentTask) {
      taskMap[workflowStatus.currentTask] = true;
    }
    
    // Mark completed tasks
    Object.keys(workflowStatus.results || {}).forEach(task => {
      if (taskMap[task] !== undefined) {
        taskMap[task] = true;
      }
    });
    
    // Count completed tasks
    completedTasks = Object.values(taskMap).filter(Boolean).length;
  }
  
  const progress = Math.floor((completedTasks / totalTasks) * 100);
  
  // Build response
  const response: any = {
    jobId: workflowStatus.workflowId,
    status: workflowStatus.status,
    progress,
    currentStep: workflowStatus.currentTask || null,
    startTime: workflowStatus.startTime,
    elapsedTimeMs: Date.now() - new Date(workflowStatus.startTime).getTime()
  };
  
  // Add report ID if available
  if (workflowStatus.status === 'completed' && 
      workflowStatus.results && 
      workflowStatus.results['generate-report']) {
    response.reportId = workflowStatus.results['generate-report'].reportId;
    response.reportUrl = `/api/reports/${response.reportId}`;
  }
  
  // Add error information if failed
  if (workflowStatus.status === 'failed') {
    response.error = {
      message: workflowStatus.metadata?.failureReason || 'Unknown error',
      code: workflowStatus.metadata?.errorCode || 'UNKNOWN_ERROR'
    };
  }
  
  return response;
}
```

## Document Upload Endpoint

Implement the document upload endpoint:

```typescript
// Document upload endpoint
router.post('/analyze', upload.single('document'), async (req, res, next) => {
  try {
    // Check if request has a file
    if (!req.file) {
      // No file, check if URL was provided instead
      if (req.body.url) {
        // Handle URL submission (reuse existing code)
        return handleUrlSubmission(req, res, next);
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DOCUMENT',
          message: 'No document uploaded and no URL provided'
        }
      });
    }
    
    // Validate file
    const validationResult = validateUploadedFile(req.file);
    if (!validationResult.valid) {
      // Remove invalid file
      await fs.promises.unlink(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DOCUMENT',
          message: validationResult.message
        }
      });
    }
    
    // Parse options if provided
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    // Create a unique job ID
    const jobId = uuidv4();
    
    // Start workflow asynchronously
    startWorkflowAsync('document-analysis', {
      documentPath: req.file.path,
      documentName: req.file.originalname,
      options
    }, jobId);
    
    // Return job ID for status checking
    return res.status(202).json({
      success: true,
      data: {
        jobId,
        status: 'submitted',
        message: 'Document analysis job submitted successfully',
        statusUrl: `/api/analyze/${jobId}`
      }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to delete uploaded file after error', {
          path: req.file.path,
          originalError: error.message,
          unlinkError: unlinkError.message
        });
      }
    }
    
    next(error);
  }
});

function validateUploadedFile(file: Express.Multer.File): { valid: boolean; message?: string } {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `File too large. Maximum size is ${formatBytes(maxSize)}`
    };
  }
  
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
    'text/markdown',
    'application/rtf'
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      message: 'Unsupported file type. Allowed types: PDF, DOCX, TXT, HTML, Markdown, RTF'
    };
  }
  
  return { valid: true };
}
```

## Report Listing Endpoint

Implement the report listing endpoint with filtering and pagination:

```typescript
// Report listing endpoint
router.get('/reports', async (req, res, next) => {
  try {
    // Parse query parameters
    const filters = parseReportFilters(req.query);
    
    // Get reports from database with pagination
    const reportRepository = new ReportRepository(db);
    const result = await reportRepository.findReports(filters);
    
    // Format pagination metadata
    const pagination = {
      total: result.total,
      pages: Math.ceil(result.total / filters.limit),
      current: filters.page,
      hasNext: filters.page * filters.limit < result.total,
      hasPrev: filters.page > 1
    };
    
    // Return paginated results
    return res.status(200).json({
      success: true,
      data: {
        reports: result.reports.map(formatReportSummary),
        pagination
      },
      meta: {
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

function parseReportFilters(query: any): ReportFilters {
  // Default values
  const defaults = {
    page: 1,
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc' as const
  };
  
  // Parse and validate filters
  const filters: ReportFilters = {
    ...defaults,
    page: parseInt(query.page, 10) || defaults.page,
    limit: Math.min(parseInt(query.limit, 10) || defaults.limit, 100),
    sortBy: ['timestamp', 'url', 'matchCount'].includes(query.sortBy) 
      ? query.sortBy 
      : defaults.sortBy,
    sortOrder: ['asc', 'desc'].includes(query.sortOrder)
      ? query.sortOrder as 'asc' | 'desc'
      : defaults.sortOrder
  };
  
  // Add optional filters if provided
  if (query.dateFrom) {
    filters.dateFrom = new Date(query.dateFrom);
  }
  
  if (query.dateTo) {
    filters.dateTo = new Date(query.dateTo);
  }
  
  if (query.url) {
    filters.url = query.url;
  }
  
  if (query.minMatches && !isNaN(parseInt(query.minMatches, 10))) {
    filters.minMatches = parseInt(query.minMatches, 10);
  }
  
  if (query.techniques) {
    filters.techniques = Array.isArray(query.techniques)
      ? query.techniques
      : [query.techniques];
  }
  
  if (query.tactics) {
    filters.tactics = Array.isArray(query.tactics)
      ? query.tactics
      : [query.tactics];
  }
  
  return filters;
}

function formatReportSummary(report: any): any {
  return {
    id: report.id,
    url: report.source.url || null,
    filename: report.source.filename || null,
    timestamp: report.timestamp,
    matchCount: report.summary.matchCount,
    topTechniques: report.summary.topTechniques.slice(0, 3),
    highConfidenceCount: report.summary.highConfidenceCount
  };
}
```

## Report Detail Endpoint

Implement the report detail endpoint:

```typescript
// Report detail endpoint
router.get('/reports/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get report from database
    const reportRepository = new ReportRepository(db);
    const report = await reportRepository.findReportById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }
    
    // Return detailed report
    return res.status(200).json({
      success: true,
      data: formatDetailedReport(report)
    });
  } catch (error) {
    next(error);
  }
});

// Report deletion endpoint
router.delete('/reports/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Delete report from database
    const reportRepository = new ReportRepository(db);
    const deleted = await reportRepository.deleteReport(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        message: 'Report deleted successfully',
        id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Report export endpoint
router.post('/reports/export', async (req, res, next) => {
  try {
    // Validate request
    const schema = z.object({
      id: z.string().uuid(),
      format: z.enum(['json', 'csv', 'html', 'pdf'])
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: result.error.format()
        }
      });
    }
    
    const { id, format } = result.data;
    
    // Get report from database
    const reportRepository = new ReportRepository(db);
    const report = await reportRepository.findReportById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }
    
    // Generate export
    const reportAgent = new ReportAgent();
    await reportAgent.initialize();
    
    const exportData = await reportAgent.exportReport(id, format);
    
    // Set appropriate headers based on format
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html',
      pdf: 'application/pdf'
    };
    
    const extensions: Record<string, string> = {
      json: 'json',
      csv: 'csv',
      html: 'html',
      pdf: 'pdf'
    };
    
    const fileName = `report-${id}.${extensions[format]}`;
    
    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return res.send(exportData);
  } catch (error) {
    next(error);
  }
});
```

## Error Handling Middleware

Implement centralized error handling middleware:

```typescript
// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error('API error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // Determine status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorMessage = 'An unexpected error occurred';
  
  // Map known errors to appropriate status codes
  if (err instanceof z.ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Invalid request data';
  } else if (err instanceof ApplicationError) {
    // Map application errors to HTTP status codes
    switch (err.code) {
      case 'URL_PROCESSING_FAILED':
      case 'DOCUMENT_PROCESSING_FAILED':
      case 'INVALID_DOCUMENT':
        statusCode = 400;
        break;
      case 'REPORT_NOT_FOUND':
      case 'JOB_NOT_FOUND':
        statusCode = 404;
        break;
      case 'RATE_LIMIT_EXCEEDED':
        statusCode = 429;
        break;
      default:
        statusCode = 500;
    }
    
    errorCode = err.code;
    errorMessage = err.message;
  }
  
  // In development, provide more details
  const details = process.env.NODE_ENV === 'development' 
    ? { stack: err.stack }
    : undefined;
  
  // Send error response
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: err instanceof z.ZodError ? err.format() : details
    }
  });
});
```

## API Response Format

Standardize API response format:

```typescript
// Success response helper
function sendSuccess<T>(res: Response, data: T, meta?: any, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0'
    }
  });
}

// Error response helper
function sendError(
  res: Response, 
  code: string, 
  message: string, 
  details?: any, 
  statusCode = 400
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0'
    }
  });
}
```

## System Status Endpoints

Implement system status endpoints:

```typescript
// System status endpoint
router.get('/system/status', async (req, res, next) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseStatus();
    
    // Get MITRE data status
    const mitreStatus = await getMitreDataStatus();
    
    // Check disk space
    const diskStatus = await checkDiskSpace();
    
    // Get processing queue status
    const queueStatus = await getQueueStatus();
    
    // Build status response
    const status = {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        nodeVersion: process.version
      },
      components: {
        database: {
          status: dbStatus.connected ? 'operational' : 'error',
          version: dbStatus.version,
          message: dbStatus.message
        },
        mitreData: {
          status: mitreStatus.available ? 'operational' : 'error',
          version: mitreStatus.version,
          lastUpdated: mitreStatus.lastUpdated,
          techniqueCount: mitreStatus.techniqueCount
        },
        storage: {
          status: diskStatus.sufficient ? 'operational' : 'warning',
          availableSpace: diskStatus.availableSpace,
          totalSpace: diskStatus.totalSpace,
          usagePercent: diskStatus.usagePercent
        },
        processingQueue: {
          status: queueStatus.healthy ? 'operational' : 'warning',
          activeJobs: queueStatus.activeJobs,
          queuedJobs: queueStatus.queuedJobs,
          completedJobs24h: queueStatus.completedJobs24h,
          failedJobs24h: queueStatus.failedJobs24h
        }
      }
    };
    
    // Return status response
    return res.status(200).json({
      success: true,
      data: status,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// MITRE update endpoint
router.post('/system/update', async (req, res, next) => {
  try {
    // Check if update is already in progress
    if (isUpdateInProgress()) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'UPDATE_IN_PROGRESS',
          message: 'A MITRE ATT&CK update is already in progress'
        }
      });
    }
    
    // Start update workflow asynchronously
    const jobId = await startUpdateWorkflow();
    
    // Return response
    return res.status(202).json({
      success: true,
      data: {
        jobId,
        status: 'updating',
        message: 'MITRE ATT&CK update started',
        statusUrl: `/api/system/update/${jobId}`
      }
    });
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});
```

## OpenAPI Documentation

Implement OpenAPI/Swagger documentation:

```typescript
// Set up Swagger documentation
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MITRE ATT&CK Analysis API',
    version: '1.0.0',
    description: 'API for analyzing documents against the MITRE ATT&CK framework'
  },
  servers: [
    {
      url: '/api',
      description: 'API endpoint'
    }
  ],
  tags: [
    {
      name: 'analyze',
      description: 'Document analysis endpoints'
    },
    {
      name: 'reports',
      description: 'Report management endpoints'
    },
    {
      name: 'system',
      description: 'System management endpoints'
    }
  ],
  paths: {
    '/analyze': {
      post: {
        tags: ['analyze'],
        summary: 'Submit URL or document for analysis',
        description: 'Analyze a URL or uploaded document against the MITRE ATT&CK framework',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL to analyze'
                  },
                  options: {
                    type: 'object',
                    properties: {
                      minConfidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'Minimum confidence threshold'
                      },
                      includeTactics: {
                        type: 'array',
                        items: {
                          type: 'string'
                        },
                        description: 'Specific tactics to include'
                      },
                      maxResults: {
                        type: 'number',
                        minimum: 1,
                        description: 'Maximum number of results'
                      }
                    }
                  }
                }
              }
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  document: {
                    type: 'string',
                    format: 'binary',
                    description: 'Document to analyze'
                  },
                  options: {
                    type: 'object',
                    properties: {
                      minConfidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'Minimum confidence threshold'
                      },
                      includeTactics: {
                        type: 'array',
                        items: {
                          type: 'string'
                        },
                        description: 'Specific tactics to include'
                      },
                      maxResults: {
                        type: 'number',
                        minimum: 1,
                        description: 'Maximum number of results'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Analysis job submitted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'object',
                      properties: {
                        jobId: {
                          type: 'string',
                          format: 'uuid',
                          example: '123e4567-e89b-12d3-a456-426614174000'
                        },
                        status: {
                          type: 'string',
                          example: 'submitted'
                        },
                        message: {
                          type: 'string',
                          example: 'Analysis job submitted successfully'
                        },
                        statusUrl: {
                          type: 'string',
                          example: '/api/analyze/123e4567-e89b-12d3-a456-426614174000'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    // Additional endpoint documentation...
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR'
              },
              message: {
                type: 'string',
                example: 'Invalid request data'
              },
              details: {
                type: 'object'
              }
            }
          }
        }
      },
      // Additional schema definitions...
    }
  }
};

// Set up Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

## API Testing

Implement comprehensive API testing:

```typescript
// Test analyze endpoint
describe('POST /api/analyze', () => {
  it('should accept URL submission and return job ID', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({
        url: 'https://example.com/document.pdf'
      })
      .expect('Content-Type', /json/)
      .expect(202);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobId).toBeDefined();
    expect(response.body.data.status).toBe('submitted');
    expect(response.body.data.statusUrl).toContain('/api/analyze/');
  });
  
  it('should reject invalid URL', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({
        url: 'invalid-url'
      })
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
  
  it('should accept document upload and return job ID', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('document', path.join(__dirname, '../test/fixtures/sample.pdf'))
      .expect('Content-Type', /json/)
      .expect(202);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobId).toBeDefined();
    expect(response.body.data.status).toBe('submitted');
  });
  
  it('should reject document that is too large', async () => {
    // Create a large test file
    const largePath = path.join(os.tmpdir(), 'large-test-file.pdf');
    const fd = await fs.promises.open(largePath, 'w');
    await fd.truncate(51 * 1024 * 1024); // 51MB
    await fd.close();
    
    const response = await request(app)
      .post('/api/analyze')
      .attach('document', largePath)
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_DOCUMENT');
    expect(response.body.error.message).toContain('File too large');
    
    // Clean up
    await fs.promises.unlink(largePath);
  });
});

// Additional test cases for other endpoints...
```
