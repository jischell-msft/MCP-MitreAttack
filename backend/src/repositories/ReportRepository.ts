import { Database } from 'better-sqlite3';
import { Report, ReportFilters, EvalMatch } from '../agents/ReportAgent';

/**
 * Repository for managing reports in the database
 */
export class ReportRepository {
    private db: Database;

    /**
     * Creates a new ReportRepository instance
     * @param db Database connection
     */
    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Save a report to the database
     * @param report Report to save
     * @returns The report ID
     */
    saveReport(report: Report): string {
        try {
            // Begin transaction
            const transaction = this.db.transaction(() => {
                // Insert report record
                this.db.prepare(`
          INSERT INTO reports (
            id, 
            workflow_id, 
            url, 
            created_at, 
            mitre_version, 
            summary_data
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
                    report.id,
                    report.source.metadata?.workflowId || null,
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
     * Get a report by ID
     * @param id Report ID
     * @returns The report or null if not found
     */
    findReportById(id: string): Report | null {
        try {
            // Get report data
            const reportData = this.db.prepare(`
        SELECT r.id, r.workflow_id, r.url, r.created_at, r.mitre_version, r.summary_data
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
                    metadata: {
                        workflowId: reportData.workflow_id
                    }
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
     * Find reports using filters with pagination
     * @param filters Search filters and pagination options
     * @returns Reports matching the criteria and pagination metadata
     */
    findReports(filters: ReportFilters) {
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

            // Calculate pagination offset
            const offset = (page - 1) * limit;

            // Build main query with sorting and pagination
            let query = `
        SELECT 
          r.id, 
          r.workflow_id,
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
            const reports = rows.map(row => {
                // For listing, we don't need to load all matches initially
                // Just return the basic report structure with summary data
                const summary = JSON.parse(row.summary_data);

                return {
                    id: row.id,
                    timestamp: new Date(row.created_at),
                    source: {
                        url: row.url,
                        filename: null,
                        metadata: {
                            workflowId: row.workflow_id
                        }
                    },
                    summary,
                    detailedMatches: [], // Don't load detailed matches for search results
                    mitreDatabaseVersion: row.mitre_version
                };
            });

            return {
                reports,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            };
        } catch (error) {
            throw new Error(`Failed to search reports: ${error.message}`);
        }
    }

    /**
     * Delete a report by ID
     * @param id Report ID
     * @returns True if the report was deleted, false if not found
     */
    deleteReport(id: string): boolean {
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
     * Sanitize a column name to prevent SQL injection
     * @param columnName Column name to sanitize
     * @returns Sanitized column name
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
}
