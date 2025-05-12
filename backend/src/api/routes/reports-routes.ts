import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess, sendPaginatedSuccess, sendError } from '../utils/api-response';
import { ValidationError, NotFoundError } from '../errors/api-error';
import { logger } from '../../utils/logger';

// Create router
export const reportsRouter = Router();

// Get reports list
reportsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Parse and validate query parameters
        const { page = '1', limit = '10', dateFrom, dateTo, url, minMatches } = req.query;

        // TODO: Implement actual report repository query
        // For now, return mock reports
        const mockReports = getMockReports();
        const total = mockReports.length;
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedReports = mockReports.slice(startIndex, endIndex);

        // Return paginated response
        return sendPaginatedSuccess(
            res,
            paginatedReports,
            pageNum,
            limitNum,
            total,
            { filters: { dateFrom, dateTo, url, minMatches } }
        );
    } catch (error) {
        next(error);
    }
});

// Get report by ID
reportsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // TODO: Implement actual report lookup
        // For now, return a mock report or 404 if not found
        const mockReport = getMockReportById(id);

        if (!mockReport) {
            throw new NotFoundError('Report', id);
        }

        return sendSuccess(res, mockReport);
    } catch (error) {
        next(error);
    }
});

// Delete report
reportsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // TODO: Implement actual report deletion
        // For now, always return success
        logger.info(`Deleting report: ${id}`);

        return sendSuccess(res, { message: 'Report deleted successfully', id });
    } catch (error) {
        next(error);
    }
});

// Export report
reportsRouter.post('/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Define request schema
        const schema = z.object({
            id: z.string().uuid(),
            format: z.enum(['json', 'csv', 'html', 'pdf'])
        });

        // Validate request
        const result = schema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError('Invalid request data', result.error.format());
        }

        const { id, format } = result.data;

        // TODO: Implement actual report export
        // For now, return a simple text response based on format
        const mockReport = getMockReportById(id);

        if (!mockReport) {
            throw new NotFoundError('Report', id);
        }

        logger.info(`Exporting report ${id} in ${format} format`);

        const contentTypes: Record<string, string> = {
            json: 'application/json',
            csv: 'text/csv',
            html: 'text/html',
            pdf: 'application/pdf'
        };

        const formatExtensions: Record<string, string> = {
            json: 'json',
            csv: 'csv',
            html: 'html',
            pdf: 'pdf'
        };

        const fileName = `report-${id}.${formatExtensions[format]}`;
        let content: string;

        switch (format) {
            case 'json':
                content = JSON.stringify(mockReport, null, 2);
                break;
            case 'csv':
                content = 'id,technique_id,technique_name,confidence_score\n' +
                    mockReport.matches.map(m =>
                        `${m.id},${m.techniqueId},${m.techniqueName},${m.confidenceScore}`
                    ).join('\n');
                break;
            case 'html':
                content = `
          <html>
            <head><title>MITRE ATT&CK Report: ${id}</title></head>
            <body>
              <h1>MITRE ATT&CK Analysis Report</h1>
              <p>ID: ${id}</p>
              <p>Created: ${mockReport.createdAt}</p>
              <h2>Matches</h2>
              <ul>
                ${mockReport.matches.map(m =>
                    `<li>${m.techniqueId} - ${m.techniqueName} (${m.confidenceScore}%)</li>`
                ).join('')}
              </ul>
            </body>
          </html>
        `;
                break;
            case 'pdf':
                // For now, return plain text since we don't have PDF generation yet
                content = `MITRE ATT&CK Report ${id}\n\n` +
                    mockReport.matches.map(m =>
                        `${m.techniqueId} - ${m.techniqueName} (${m.confidenceScore}%)`
                    ).join('\n');
                break;
            default:
                content = '';
        }

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        return res.send(content);
    } catch (error) {
        next(error);
    }
});

/**
 * Get mock reports
 */
function getMockReports(): any[] {
    return Array.from({ length: 20 }, (_, i) => ({
        id: `report-${(i + 1).toString().padStart(8, '0')}`,
        url: i % 2 === 0 ? `https://example.com/document${i + 1}.pdf` : null,
        filename: i % 2 === 0 ? null : `document${i + 1}.pdf`,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(), // One day apart
        matchCount: 5 + (i % 10),
        highConfidenceCount: 2 + (i % 5),
        topTechniques: [
            { id: 'T1566', name: 'Phishing', score: 95 },
            { id: 'T1078', name: 'Valid Accounts', score: 90 },
            { id: 'T1486', name: 'Data Encrypted for Impact', score: 85 }
        ]
    }));
}

/**
 * Get mock report by ID
 */
function getMockReportById(id: string): any | null {
    // Extract numeric part from ID for deterministic mocking
    const match = id.match(/\d+/);
    if (!match) return null;

    const num = parseInt(match[0], 10);
    if (isNaN(num) || num > 30) return null; // Simulate not found for some IDs

    return {
        id,
        url: num % 2 === 0 ? `https://example.com/document${num}.pdf` : null,
        filename: num % 2 === 0 ? null : `document${num}.pdf`,
        createdAt: new Date(Date.now() - num * 86400000).toISOString(),
        mitreVersion: '13.1',
        summary: {
            matchCount: 5 + (num % 10),
            highConfidenceCount: 2 + (num % 5),
            tacticsBreakdown: {
                'initial-access': 2,
                'execution': 3,
                'persistence': 1,
                'defense-evasion': 2
            },
            topTechniques: [
                { id: 'T1566', name: 'Phishing', score: 95 },
                { id: 'T1078', name: 'Valid Accounts', score: 90 },
                { id: 'T1486', name: 'Data Encrypted for Impact', score: 85 }
            ],
            keyFindings: [
                'Potential phishing attack detected',
                'Multiple defense evasion techniques identified',
                'Possible data encryption for ransom'
            ]
        },
        matches: [
            {
                id: '1',
                techniqueId: 'T1566',
                techniqueName: 'Phishing',
                confidenceScore: 95,
                contextText: 'Email containing malicious download link identified'
            },
            {
                id: '2',
                techniqueId: 'T1078',
                techniqueName: 'Valid Accounts',
                confidenceScore: 90,
                contextText: 'Admin credentials used to access internal systems'
            },
            {
                id: '3',
                techniqueId: 'T1486',
                techniqueName: 'Data Encrypted for Impact',
                confidenceScore: 85,
                contextText: 'File encryption followed by ransom demand'
            },
            {
                id: '4',
                techniqueId: 'T1027',
                techniqueName: 'Obfuscated Files or Information',
                confidenceScore: 80,
                contextText: 'Obfuscated PowerShell script detected'
            },
            {
                id: '5',
                techniqueId: 'T1059.001',
                techniqueName: 'Command and Scripting Interpreter: PowerShell',
                confidenceScore: 75,
                contextText: 'PowerShell used to execute remote commands'
            }
        ]
    };
}
