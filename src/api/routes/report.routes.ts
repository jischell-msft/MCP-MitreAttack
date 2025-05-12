import { Router } from 'express';
import { z } from 'zod';
import { ReportRepository } from '../../repositories/report.repository';
import { db } from '../../db/connection';
import { ReportAgent } from '../../agents/report.agent';

const router = Router();

// Report listing endpoint with filtering and pagination
router.get('/', async (req, res, next) => {
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

// Report detail endpoint
router.get('/:id', async (req, res, next) => {
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
router.delete('/:id', async (req, res, next) => {
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
router.post('/export', async (req, res, next) => {
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

// Helper function to parse report filters
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

// Helper function to format report summary for listing
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

// Helper function to format detailed report
function formatDetailedReport(report: any): any {
    // This function could transform the report if needed
    // For now, we just return the report as-is
    return report;
}

// Interface for report filters
interface ReportFilters {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    dateFrom?: Date;
    dateTo?: Date;
    url?: string;
    minMatches?: number;
    techniques?: string[];
    tactics?: string[];
}

export default router;
