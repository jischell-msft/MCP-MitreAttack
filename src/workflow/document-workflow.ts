import { z } from 'zod';
import { WorkflowDefinition } from './types';
import { FetchAgent } from '../agents/fetch/fetch-agent';
import { ParseAgent } from '../agents/parse/parse-agent';
import { DocIngestAgent } from '../agents/ingest/doc-ingest-agent';
import { EvalAgent } from '../agents/eval/eval-agent';
import { ReportAgent } from '../agents/report/report-agent';
import { handleUrlInput, handleDocumentInput, mergeEvalResults } from './agents/agent-integration';
import { config } from '../config';

/**
 * Document analysis workflow definition
 * Processes a document (from URL or file) against the MITRE ATT&CK framework
 */
export const documentAnalysisWorkflow: WorkflowDefinition = {
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
                    // Other technique fields omitted for brevity
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
                        url: z.string().url().optional(),
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

/**
 * MITRE update workflow definition
 * Updates the local MITRE ATT&CK database
 */
export const mitreUpdateWorkflow: WorkflowDefinition = {
    id: 'mitre-update',
    name: 'MITRE ATT&CK Update Workflow',
    description: 'Updates the local MITRE ATT&CK database',
    tasks: [
        {
            name: 'fetch-mitre-data',
            handler: async (context, input) => {
                const fetchAgent = new FetchAgent({
                    sourceUrl: config.mitreAttackUrl,
                    cacheDir: config.mitreCacheDir,
                    updateInterval: 0, // Force update
                    maxRetries: 3,
                    requestTimeout: 30000
                });

                await fetchAgent.initialize();

                // Force refresh
                const fetchResult = await fetchAgent.refreshData();

                return {
                    rawData: fetchResult.mitreData,
                    version: fetchResult.version,
                    timestamp: fetchResult.timestamp
                };
            },
            inputSchema: z.object({}),
            outputSchema: z.object({
                rawData: z.any(),
                version: z.string(),
                timestamp: z.date()
            }),
            timeout: 60000,
            retries: 3,
            retryDelay: 5000
        },
        {
            name: 'parse-mitre-data',
            handler: async (context, input) => {
                const fetchResult = context.results['fetch-mitre-data'];

                const parseAgent = new ParseAgent({
                    includeSubtechniques: true,
                    includeTactics: true,
                    includeDataSources: true,
                    extractKeywords: true
                });

                await parseAgent.initialize();

                // Parse the MITRE data
                const parseResult = await parseAgent.parse(fetchResult.rawData);

                return {
                    techniques: parseResult.techniques,
                    techniqueIndex: parseResult.techniqueIndex,
                    tacticsByTechnique: parseResult.tacticsByTechnique,
                    version: fetchResult.version
                };
            },
            inputSchema: z.object({}),
            outputSchema: z.object({
                techniques: z.array(z.any()),
                techniqueIndex: z.any(),
                tacticsByTechnique: z.any(),
                version: z.string()
            }),
            timeout: 60000,
            retries: 2,
            retryDelay: 5000
        },
        {
            name: 'update-database',
            handler: async (context, input) => {
                const parseResult = context.results['parse-mitre-data'];

                // In a real implementation, this would update the database
                // For now, logging the update
                const techniquesCount = parseResult.techniques.length;
                const version = parseResult.version;

                // Return success information
                return {
                    updated: true,
                    techniquesCount,
                    version,
                    timestamp: new Date()
                };
            },
            inputSchema: z.object({}),
            outputSchema: z.object({
                updated: z.boolean(),
                techniquesCount: z.number(),
                version: z.string(),
                timestamp: z.date()
            }),
            timeout: 60000,
            retries: 2,
            retryDelay: 5000
        }
    ],
    dependencies: {
        'fetch-mitre-data': [],
        'parse-mitre-data': ['fetch-mitre-data'],
        'update-database': ['parse-mitre-data']
    }
};
