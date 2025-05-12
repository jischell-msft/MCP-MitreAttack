/**
 * OpenAPI documentation configuration
 */
export const swaggerDocument = {
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
        '/analyze/{jobId}': {
            get: {
                tags: ['analyze'],
                summary: 'Get analysis job status',
                description: 'Check the status of an analysis job',
                parameters: [
                    {
                        name: 'jobId',
                        in: 'path',
                        description: 'ID of the analysis job',
                        required: true,
                        schema: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Job status retrieved successfully',
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
                                                    format: 'uuid'
                                                },
                                                status: {
                                                    type: 'string',
                                                    enum: ['submitted', 'running', 'completed', 'failed']
                                                },
                                                progress: {
                                                    type: 'number',
                                                    description: 'Progress percentage'
                                                },
                                                currentStep: {
                                                    type: 'string',
                                                    nullable: true
                                                },
                                                elapsedTimeMs: {
                                                    type: 'number'
                                                },
                                                reportId: {
                                                    type: 'string',
                                                    nullable: true
                                                },
                                                reportUrl: {
                                                    type: 'string',
                                                    nullable: true
                                                },
                                                error: {
                                                    type: 'object',
                                                    nullable: true,
                                                    properties: {
                                                        code: {
                                                            type: 'string'
                                                        },
                                                        message: {
                                                            type: 'string'
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'Job not found',
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
        '/reports': {
            get: {
                tags: ['reports'],
                summary: 'List reports',
                description: 'Get a list of analysis reports with pagination and filtering',
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        description: 'Page number',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1
                        }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        description: 'Items per page',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20
                        }
                    },
                    {
                        name: 'sortBy',
                        in: 'query',
                        description: 'Field to sort by',
                        schema: {
                            type: 'string',
                            enum: ['timestamp', 'url', 'matchCount'],
                            default: 'timestamp'
                        }
                    },
                    {
                        name: 'sortOrder',
                        in: 'query',
                        description: 'Sort order',
                        schema: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc'
                        }
                    },
                    {
                        name: 'dateFrom',
                        in: 'query',
                        description: 'Filter by date (from)',
                        schema: {
                            type: 'string',
                            format: 'date-time'
                        }
                    },
                    {
                        name: 'dateTo',
                        in: 'query',
                        description: 'Filter by date (to)',
                        schema: {
                            type: 'string',
                            format: 'date-time'
                        }
                    },
                    {
                        name: 'url',
                        in: 'query',
                        description: 'Filter by URL',
                        schema: {
                            type: 'string'
                        }
                    },
                    {
                        name: 'techniques',
                        in: 'query',
                        description: 'Filter by technique IDs',
                        schema: {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    },
                    {
                        name: 'tactics',
                        in: 'query',
                        description: 'Filter by tactics',
                        schema: {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Reports retrieved successfully',
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
                                                reports: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: {
                                                                type: 'string'
                                                            },
                                                            url: {
                                                                type: 'string',
                                                                nullable: true
                                                            },
                                                            filename: {
                                                                type: 'string',
                                                                nullable: true
                                                            },
                                                            timestamp: {
                                                                type: 'string',
                                                                format: 'date-time'
                                                            },
                                                            matchCount: {
                                                                type: 'integer'
                                                            },
                                                            topTechniques: {
                                                                type: 'array',
                                                                items: {
                                                                    type: 'object'
                                                                }
                                                            },
                                                            highConfidenceCount: {
                                                                type: 'integer'
                                                            }
                                                        }
                                                    }
                                                },
                                                pagination: {
                                                    type: 'object',
                                                    properties: {
                                                        total: {
                                                            type: 'integer'
                                                        },
                                                        pages: {
                                                            type: 'integer'
                                                        },
                                                        current: {
                                                            type: 'integer'
                                                        },
                                                        hasNext: {
                                                            type: 'boolean'
                                                        },
                                                        hasPrev: {
                                                            type: 'boolean'
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        // Additional endpoints would be documented here
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
            // Additional schema definitions would go here
        }
    }
};
