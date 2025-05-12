import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import handlebars from 'handlebars';
import { parse as csvParse } from 'json2csv';
import pdfkit from 'pdfkit';

/**
 * Configuration options for the ReportAgent
 */
export interface ReportAgentConfig {
    defaultFormat: 'json' | 'html' | 'csv' | 'pdf';
    includeRawMatches: boolean;
    maxMatchesInSummary: number;
    confidenceThreshold: number;
    includeTacticBreakdown: boolean;
}

/**
 * Document information for report generation
 */
export interface DocumentInfo {
    url?: string;
    filename?: string;
    metadata: Record<string, any>;
}

/**
 * Match results from evaluation
 */
export interface EvalMatch {
    techniqueId: string;
    techniqueName: string;
    confidenceScore: number;
    matchedText: string;
    context: string;
    textPosition: {
        startChar: number;
        endChar: number;
    };
    matchSource: string;
}

/**
 * Evaluation results from EvalAgent
 */
export interface EvalResult {
    matches: EvalMatch[];
    summary: {
        documentId: string;
        matchCount: number;
        topTechniques: string[];
        tacticsCoverage: Record<string, number>;
        azureOpenAIUsed: boolean;
        processingTimeMs: number;
    };
}

/**
 * Report structure for storing and retrieving
 */
export interface Report {
    id: string;
    timestamp: Date;
    source: {
        url?: string;
        filename?: string;
        metadata: Record<string, any>;
    };
    summary: {
        matchCount: number;
        highConfidenceCount: number;
        tacticsBreakdown: Record<string, number>;
        topTechniques: Array<{
            id: string;
            name: string;
            score: number;
        }>;
        keyFindings: string[];
    };
    detailedMatches: Array<EvalMatch>;
    mitreDatabaseVersion: string;
}

/**
 * Filter parameters for searching reports
 */
export interface ReportFilters {
    dateFrom?: Date;
    dateTo?: Date;
    url?: string;
    minMatches?: number;
    techniques?: string[];
    tactics?: string[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Search results with pagination
 */
export interface ReportSearchResult {
    reports: Report[];
    pagination: {
        total: number;
        pages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * ReportAgent handles generating, storing, and retrieving analysis reports
 */
export class ReportAgent {
    private db: Database;
    private config: ReportAgentConfig;
    private templateCache: Record<string, HandlebarsTemplateDelegate> = {};
    private initialized = false;

    /**
     * Creates a new ReportAgent instance
     */
    constructor(config?: Partial<ReportAgentConfig>, db?: Database) {
        this.config = {
            defaultFormat: 'json',
            includeRawMatches: true,
            maxMatchesInSummary: 10,
            confidenceThreshold: 75,
            includeTacticBreakdown: true,
            ...config
        };

        if (db) {
            this.db = db;
        }
    }

    /**
     * Initializes the ReportAgent
     */
    async initialize(): Promise<void> {
        if (!this.db) {
            try {
                const { getDatabase } = await import('../db/database');
                this.db = getDatabase();
            } catch (error) {
                throw new Error(`Failed to initialize database connection: ${error.message}`);
            }
        }

        // Load and compile templates
        try {
            const templatesDir = path.join(__dirname, '../templates');
            const htmlTemplate = await fs.readFile(path.join(templatesDir, 'report.html'), 'utf8');
            this.templateCache.html = handlebars.compile(htmlTemplate);
            this.initialized = true;
        } catch (error) {
            // Templates might not be available in all environments, so we'll just log
            console.warn(`Failed to load templates: ${error.message}`);
        }

        this.initialized = true;
    }

    /**
     * Generate a report from evaluation results
     */
    async generateReport(evalResult: EvalResult, documentInfo: DocumentInfo): Promise<Report> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Create unique report ID
        const id = uuidv4();

        // Extract high confidence matches
        const highConfidenceMatches = evalResult.matches.filter(
            m => m.confidenceScore >= this.config.confidenceThreshold
        );

        // Generate tactics breakdown
        const tacticsBreakdown = this.calculateTacticsBreakdown(evalResult.matches);

        // Generate top techniques
        const topTechniques = [...evalResult.matches]
            .sort((a, b) => b.confidenceScore - a.confidenceScore)
            .slice(0, this.config.maxMatchesInSummary)
            .map(m => ({
                id: m.techniqueId,
                name: m.techniqueName,
                score: m.confidenceScore
            }));

        // Generate key findings
        const keyFindings = this.generateKeyFindings(evalResult.matches, tacticsBreakdown);

        // Compile the complete report
        const report: Report = {
            id,
            timestamp: new Date(),
            source: {
                url: documentInfo.url,
                filename: documentInfo.filename,
                metadata: documentInfo.metadata || {}
            },
            summary: {
                matchCount: evalResult.matches.length,
                highConfidenceCount: highConfidenceMatches.length,
                tacticsBreakdown,
                topTechniques,
                keyFindings
            },
            detailedMatches: evalResult.matches,
            mitreDatabaseVersion: '' // This will be set by the workflow
        };

        return report;
    }

    /**
     * Save a report to the database
     */
    async saveReport(report: Report): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Begin transaction
            const transaction = this.db.transaction(() => {
                // Insert report record
                this.db.prepare(`
          INSERT INTO reports (
            id, 
            url, 
            created_at, 
            mitre_version, 
            summary_data
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
                    report.id,
                    report.source.url || null,
                    report.timestamp.toISOString(),
                    report.mitreDatabaseVersion,
                    JSON.stringify(report.summary)
                );

                // Insert matches
                const insertMatch = this.db.prepare(`
          INSERT INTO matches (
            report_id, 
            technique_id, 
            technique_name, 
            confidence_score, 
            context_text
          ) VALUES (?, ?, ?, ?, ?)
        `);

                // Insert each match
                for (const match of report.detailedMatches) {
                    insertMatch.run(
                        report.id,
                        match.techniqueId,
                        match.techniqueName,
                        match.confidenceScore,
                        match.context
                    );
                }

                return report.id;
            });

            return transaction();
        } catch (error) {
            throw new Error(`Failed to save report: ${error.message}`);
        }
    }

    /**
     * Retrieve a report by ID
     */
    async getReportById(id: string): Promise<Report | null> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Get report data
            const reportData = this.db.prepare(`
        SELECT r.id, r.url, r.created_at, r.mitre_version, r.summary_data
        FROM reports r
        WHERE r.id = ?
      `).get(id);

            if (!reportData) {
                return null;
            }

            // Get matches for this report
            const matches = this.db.prepare(`
        SELECT 
          m.technique_id, 
          m.technique_name, 
          m.confidence_score, 
          m.context_text
        FROM matches m
        WHERE m.report_id = ?
        ORDER BY m.confidence_score DESC
      `).all(id);

            // Format matches as EvalMatch objects
            const detailedMatches: EvalMatch[] = matches.map(match => ({
                techniqueId: match.technique_id,
                techniqueName: match.technique_name,
                confidenceScore: match.confidence_score,
                matchedText: match.context_text,
                context: match.context_text,
                textPosition: {
                    startChar: 0,
                    endChar: match.context_text?.length || 0
                },
                matchSource: 'database'
            }));

            // Parse summary data
            const summary = JSON.parse(reportData.summary_data);

            // Assemble full report
            const report: Report = {
                id: reportData.id,
                timestamp: new Date(reportData.created_at),
                source: {
                    url: reportData.url,
                    filename: null,
                    metadata: {}
                },
                summary,
                detailedMatches,
                mitreDatabaseVersion: reportData.mitre_version
            };

            return report;
        } catch (error) {
            throw new Error(`Failed to get report: ${error.message}`);
        }
    }

    /**
     * Search for reports using filters
     */
    async searchReports(filters: ReportFilters): Promise<ReportSearchResult> {
        if (!this.initialized) {
            await this.initialize();
        }

        const {
            dateFrom,
            dateTo,
            url,
            minMatches,
            techniques,
            tactics,
            page = 1,
            limit = 20,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = filters;

        try {
            // Build the query conditions
            const conditions: string[] = ['1=1'];
            const params: any[] = [];

            if (dateFrom) {
                conditions.push('r.created_at >= ?');
                params.push(dateFrom.toISOString());
            }

            if (dateTo) {
                conditions.push('r.created_at <= ?');
                params.push(dateTo.toISOString());
            }

            if (url) {
                conditions.push('r.url LIKE ?');
                params.push(`%${url}%`);
            }

            // Count total results for pagination
            const countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM reports r
        WHERE ${conditions.join(' AND ')}
      `;

            const { total } = this.db.prepare(countQuery).get(...params);

            // Calculate pagination metadata
            const pages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;
            const hasNext = page < pages;
            const hasPrev = page > 1;

            // Build main query with sorting and pagination
            let query = `
        SELECT 
          r.id, 
          r.url, 
          r.created_at, 
          r.mitre_version, 
          r.summary_data,
          (SELECT COUNT(*) FROM matches m WHERE m.report_id = r.id) as match_count
        FROM reports r
        WHERE ${conditions.join(' AND ')}
      `;

            // Add filter by match count if specified
            if (typeof minMatches === 'number') {
                query += `
          HAVING match_count >= ?
        `;
                params.push(minMatches);
            }

            // Add sorting and pagination
            query += `
        ORDER BY ${this.sanitizeColumnName(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
        LIMIT ? OFFSET ?
      `;
            params.push(limit, offset);

            // Execute the query
            const rows = this.db.prepare(query).all(...params);

            // Format the results
            const reports: Report[] = await Promise.all(
                rows.map(async row => {
                    // For listing, we don't need to load all matches initially
                    // Just return the basic report structure with summary data
                    const summary = JSON.parse(row.summary_data);

                    return {
                        id: row.id,
                        timestamp: new Date(row.created_at),
                        source: {
                            url: row.url,
                            filename: null,
                            metadata: {}
                        },
                        summary,
                        detailedMatches: [], // Don't load detailed matches for search results
                        mitreDatabaseVersion: row.mitre_version
                    };
                })
            );

            return {
                reports,
                pagination: {
                    total,
                    pages,
                    currentPage: page,
                    hasNext,
                    hasPrev
                }
            };
        } catch (error) {
            throw new Error(`Failed to search reports: ${error.message}`);
        }
    }

    /**
     * Export a report to a specific format
     */
    async exportReport(id: string, format: string): Promise<Buffer> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Get the report
        const report = await this.getReportById(id);
        if (!report) {
            throw new Error(`Report with ID ${id} not found`);
        }

        // Export in requested format
        switch (format.toLowerCase()) {
            case 'json':
                return this.exportReportAsJson(report);
            case 'html':
                return this.exportReportAsHtml(report);
            case 'csv':
                return this.exportReportAsCsv(report);
            case 'pdf':
                return this.exportReportAsPdf(report);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Delete a report by ID
     */
    async deleteReport(id: string): Promise<boolean> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Begin transaction
            const transaction = this.db.transaction(() => {
                // Delete matches first (foreign key constraint)
                this.db.prepare('DELETE FROM matches WHERE report_id = ?').run(id);

                // Delete the report
                const { changes } = this.db.prepare('DELETE FROM reports WHERE id = ?').run(id);

                return changes > 0;
            });

            return transaction();
        } catch (error) {
            throw new Error(`Failed to delete report: ${error.message}`);
        }
    }

    /**
     * Calculate tactics breakdown for a set of matches
     */
    private calculateTacticsBreakdown(matches: EvalMatch[]): Record<string, number> {
        const tacticsMapping: Record<string, string[]> = {
            'T1566': ['initial-access'],
            'T1078': ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
            'T1189': ['initial-access'],
            'T1190': ['initial-access'],
            'T1133': ['persistence', 'initial-access'],
            'T1091': ['lateral-movement', 'initial-access'],
            'T1195': ['initial-access', 'supply-chain-compromise'],
            'T1199': ['initial-access'],
            'T1200': ['initial-access'],
            'T1592': ['reconnaissance'],
            'T1589': ['reconnaissance'],
            'T1590': ['reconnaissance'],
            'T1591': ['reconnaissance'],
            'T1598': ['reconnaissance'],
            'T1597': ['reconnaissance'],
            'T1596': ['reconnaissance'],
            'T1593': ['reconnaissance'],
            'T1594': ['reconnaissance'],
            'T1595': ['reconnaissance'],
            // This is just a sample - in a real implementation, 
            // this would be loaded from the MITRE data
        };

        const breakdown: Record<string, number> = {
            'reconnaissance': 0,
            'resource-development': 0,
            'initial-access': 0,
            'execution': 0,
            'persistence': 0,
            'privilege-escalation': 0,
            'defense-evasion': 0,
            'credential-access': 0,
            'discovery': 0,
            'lateral-movement': 0,
            'collection': 0,
            'command-and-control': 0,
            'exfiltration': 0,
            'impact': 0
        };

        // Count matches by tactic
        for (const match of matches) {
            const tactics = tacticsMapping[match.techniqueId] || [];

            for (const tactic of tactics) {
                if (breakdown[tactic] !== undefined) {
                    breakdown[tactic]++;
                }
            }
        }

        // Remove tactics with 0 matches
        return Object.fromEntries(
            Object.entries(breakdown).filter(([_, count]) => count > 0)
        );
    }

    /**
     * Generate key findings based on matches and tactics
     */
    private generateKeyFindings(
        matches: EvalMatch[],
        tacticsBreakdown: Record<string, number>
    ): string[] {
        const findings: string[] = [];

        // Find tactics with the most matches
        const tacticEntries = Object.entries(tacticsBreakdown)
            .sort((a, b) => b[1] - a[1]);

        const highConfidenceMatches = matches
            .filter(m => m.confidenceScore >= this.config.confidenceThreshold)
            .sort((a, b) => b.confidenceScore - a.confidenceScore);

        // Add finding about most prevalent tactic if we have any
        if (tacticEntries.length > 0) {
            const [mostPrevalentTactic, count] = tacticEntries[0];
            const tacticName = this.formatTacticName(mostPrevalentTactic);

            findings.push(
                `The document contains ${count} references to techniques in the ${tacticName} tactic, ` +
                `suggesting this may be a focus area.`
            );
        }

        // Add finding about top techniques
        if (highConfidenceMatches.length > 0) {
            const topMatch = highConfidenceMatches[0];

            findings.push(
                `The technique ${topMatch.techniqueName} (${topMatch.techniqueId}) was identified with ` +
                `high confidence (${topMatch.confidenceScore}%), suggesting particular attention should be paid to this area.`
            );
        }

        // Add finding about technique diversity
        const uniqueTechniques = new Set(matches.map(m => m.techniqueId));
        if (uniqueTechniques.size > 5) {
            findings.push(
                `The document references ${uniqueTechniques.size} distinct MITRE ATT&CK techniques, ` +
                `indicating a broad range of tactics and procedures.`
            );
        }

        // Add finding about attack lifecycle if multiple tactics present
        if (tacticEntries.length >= 3) {
            findings.push(
                `The analysis has identified techniques across ${tacticEntries.length} different tactics, ` +
                `suggesting a comprehensive description of an attack lifecycle.`
            );
        }

        return findings;
    }

    /**
     * Format a tactic ID to a readable name
     */
    private formatTacticName(tacticId: string): string {
        // Convert tactic-id to Tactic Id format
        return tacticId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Sanitize a column name to prevent SQL injection
     */
    private sanitizeColumnName(columnName: string): string {
        // Simple validation - only allow alphanumeric and underscore
        const validColumnName = columnName.replace(/[^a-z0-9_]/gi, '');

        // If we stripped everything, return a default
        if (!validColumnName) {
            return 'created_at';
        }

        return validColumnName;
    }

    /**
     * Export a report as JSON
     */
    private async exportReportAsJson(report: Report): Promise<Buffer> {
        return Buffer.from(JSON.stringify(report, null, 2), 'utf8');
    }

    /**
     * Export a report as HTML
     */
    private async exportReportAsHtml(report: Report): Promise<Buffer> {
        if (!this.templateCache.html) {
            throw new Error('HTML template not found');
        }

        const html = this.templateCache.html(report);
        return Buffer.from(html, 'utf8');
    }

    /**
     * Export a report as CSV
     */
    private async exportReportAsCsv(report: Report): Promise<Buffer> {
        // Prepare data for CSV format
        const csvData = report.detailedMatches.map(match => ({
            'Technique ID': match.techniqueId,
            'Technique Name': match.techniqueName,
            'Confidence Score': match.confidenceScore,
            'Matched Text': match.matchedText,
            'Context': match.context
        }));

        // Convert to CSV
        const csv = csvParse(csvData, {
            header: true,
            includeEmptyRows: false
        });

        return Buffer.from(csv, 'utf8');
    }

    /**
     * Export a report as PDF
     */
    private async exportReportAsPdf(report: Report): Promise<Buffer> {
        // In a real implementation, this would use the PDF library to generate a PDF
        // For now, we'll just convert the HTML to a very simple PDF

        // Generate HTML first
        const htmlContent = await this.exportReportAsHtml(report);

        // Create a PDF document
        const pdfDoc = new pdfkit();

        // Convert buffer to chunks
        return new Promise((resolve, reject) => {
            try {
                const chunks: Buffer[] = [];

                pdfDoc.on('data', chunk => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', reject);

                // Add title
                pdfDoc.fontSize(24).text(`MITRE ATT&CK Analysis Report`, { align: 'center' });
                pdfDoc.moveDown();

                // Add report metadata
                pdfDoc.fontSize(12).text(`Report ID: ${report.id}`);
                pdfDoc.text(`Generated: ${report.timestamp.toLocaleString()}`);
                if (report.source.url) {
                    pdfDoc.text(`Source URL: ${report.source.url}`);
                }
                pdfDoc.moveDown();

                // Add summary
                pdfDoc.fontSize(18).text('Executive Summary');
                pdfDoc.moveDown(0.5);
                pdfDoc.fontSize(12);
                for (const finding of report.summary.keyFindings) {
                    pdfDoc.text(`• ${finding}`, { indent: 20 });
                }
                pdfDoc.moveDown();

                // Add matches table
                pdfDoc.fontSize(18).text('Technique Matches');
                pdfDoc.moveDown(0.5);

                // Table header
                pdfDoc.fontSize(10);
                const startY = pdfDoc.y;
                pdfDoc.text('Technique ID', 50, startY);
                pdfDoc.text('Technique Name', 150, startY);
                pdfDoc.text('Confidence', 350, startY);
                pdfDoc.moveDown();

                // Table rows
                report.detailedMatches
                    .sort((a, b) => b.confidenceScore - a.confidenceScore)
                    .forEach((match, i) => {
                        const y = pdfDoc.y;
                        pdfDoc.text(match.techniqueId, 50, y);
                        pdfDoc.text(match.techniqueName.substring(0, 30), 150, y);
                        pdfDoc.text(`${match.confidenceScore}%`, 350, y);
                        pdfDoc.moveDown(0.5);

                        // Avoid overcrowding the page
                        if (i > 0 && i % 20 === 0) {
                            pdfDoc.addPage();
                        }
                    });

                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}
