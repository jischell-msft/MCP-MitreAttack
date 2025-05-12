import { z } from 'zod';
import { TaskDefinition } from '../types';
import { ReportAgent } from '../../agents/ReportAgent';

/**
 * Task definition for generating reports from evaluation results
 */
export const createReportTask = (config: any): TaskDefinition => ({
    name: 'generate-report',
    handler: async (context, input) => {
        const { documentData, evalResults, mitreData } = input;

        // Initialize ReportAgent
        const reportAgent = new ReportAgent({
            defaultFormat: 'json',
            includeRawMatches: true,
            maxMatchesInSummary: config.maxMatchesInSummary || 10,
            confidenceThreshold: config.confidenceThreshold || 75,
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
    inputSchema: z.object({
        documentData: z.object({
            sourceUrl: z.string().optional(),
            sourceFile: z.string().optional(),
            documentMetadata: z.record(z.string(), z.any()).optional()
        }),
        evalResults: z.object({
            matches: z.array(z.object({
                techniqueId: z.string(),
                techniqueName: z.string(),
                confidenceScore: z.number(),
                matchedText: z.string(),
                context: z.string(),
                textPosition: z.object({
                    startChar: z.number(),
                    endChar: z.number()
                }).optional(),
                matchSource: z.string()
            })),
            summary: z.object({
                documentId: z.string(),
                matchCount: z.number(),
                topTechniques: z.array(z.string()),
                tacticsCoverage: z.record(z.string(), z.number()),
                processingTimeMs: z.number(),
                azureOpenAIUsed: z.boolean()
            })
        }),
        mitreData: z.object({
            version: z.string()
        })
    }),
    outputSchema: z.object({
        reportId: z.string(),
        report: z.object({
            id: z.string(),
            timestamp: z.date(),
            source: z.object({
                url: z.string().optional(),
                filename: z.string().optional(),
                metadata: z.record(z.string(), z.any()).optional()
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
                context: z.string()
            })),
            mitreDatabaseVersion: z.string()
        })
    }),
    timeout: 60000,  // 1 minute
    retries: 2,
    retryDelay: 5000  // 5 seconds
});
