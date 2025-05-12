import { BaseRepository } from './base-repository';
import { executeTransaction } from '../connection';
import { Report } from '../../models/report';
import { generateUUID } from '../../utils';

export interface ReportFilter {
    page: number;
    limit: number;
    dateFrom?: Date;
    dateTo?: Date;
    url?: string;
    workflowId?: string;
    minMatches?: number;
    techniques?: string[];
    tactics?: string[];
}

export interface PaginatedReports {
    reports: Report[];
    total: number;
}

export class ReportRepository extends BaseRepository<Report> {
    constructor() {
        super('reports');
    }

    /**
     * Create a new report
     */
    create(report: Report): string {
        const id = report.id || generateUUID();

        try {
            this.db.prepare(`
        INSERT INTO reports (
          id, workflow_id, url, created_at, mitre_version, summary_data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
                id,
                report.workflowId,
                report.url || null,
                report.createdAt.toISOString(),
                report.mitreVersion,
                JSON.stringify(report.summary)
            );

            return id;
        } catch (error) {
            console.error(`Error creating report: ${error}`);
            throw error;
        }
    }

    /**
     * Update an existing report
     */
    update(id: string, reportData: Partial<Report>): boolean {
        try {
            const existingReport = this.findById(id);

            if (!existingReport) {
                return false;
            }

            const setFields: string[] = [];
            const params: any[] = [];

            if (reportData.url !== undefined) {
                setFields.push('url = ?');
                params.push(reportData.url);
            }

            if (reportData.mitreVersion !== undefined) {
                setFields.push('mitre_version = ?');
                params.push(reportData.mitreVersion);
            }

            if (reportData.summary !== undefined) {
                setFields.push('summary_data = ?');
                params.push(JSON.stringify(reportData.summary));
            }

            if (setFields.length === 0) {
                return true; // Nothing to update
            }

            params.push(id);

            const query = `UPDATE reports SET ${setFields.join(', ')} WHERE id = ?`;
            const result = this.db.prepare(query).run(...params);

            return result.changes > 0;
        } catch (error) {
            console.error(`Error updating report: ${error}`);
            return false;
        }
    }

    /**
     * Find reports with pagination and filters
     */
    findReports(filter: ReportFilter): PaginatedReports {
        try {
            // Base query without pagination
            const baseQuery = 'SELECT * FROM reports';

            // Apply filters
            const filters: Record<string, any> = {};

            if (filter.workflowId) {
                filters['workflow_id'] = filter.workflowId;
            }

            if (filter.url) {
                filters['url'] = filter.url;
            }

            const { whereClause, params } = this.buildWhereClause(filters);

            // Count total matching records
            const countQuery = `SELECT COUNT(*) as count FROM reports ${whereClause}`;
            const countResult = this.db.prepare(countQuery).get(...params) as { count: number };

            // Apply pagination
            const paginatedQuery = this.buildPaginatedQuery(
                `${baseQuery} ${whereClause} ORDER BY created_at DESC`,
                filter.page,
                filter.limit
            );

            const reports = this.db.prepare(paginatedQuery).all(...params) as any[];

            // Transform raw data to Report objects
            const mappedReports: Report[] = reports.map(rawReport => ({
                id: rawReport.id,
                workflowId: rawReport.workflow_id,
                url: rawReport.url,
                createdAt: new Date(rawReport.created_at),
                mitreVersion: rawReport.mitre_version,
                summary: JSON.parse(rawReport.summary_data)
            }));

            return {
                reports: mappedReports,
                total: countResult.count
            };
        } catch (error) {
            console.error(`Error finding reports: ${error}`);
            return { reports: [], total: 0 };
        }
    }

    /**
     * Find a report by ID with its matches
     */
    async findReportWithMatches(id: string): Promise<Report | null> {
        try {
            const report = this.findById(id);

            if (!report) {
                return null;
            }

            // Get matches for this report
            const matches = this.db.prepare(
                'SELECT * FROM matches WHERE report_id = ?'
            ).all(id);

            return {
                ...report,
                matches: matches.map(match => ({
                    id: match.id,
                    techniqueId: match.technique_id,
                    techniqueName: match.technique_name,
                    confidenceScore: match.confidence_score,
                    contextText: match.context_text
                }))
            };
        } catch (error) {
            console.error(`Error finding report with matches: ${error}`);
            return null;
        }
    }

    /**
     * Delete a report and its matches
     */
    deleteReport(id: string): boolean {
        return executeTransaction(db => {
            // Delete matches first due to foreign key constraint
            const deleteMatches = db.prepare('DELETE FROM matches WHERE report_id = ?');
            deleteMatches.run(id);

            // Delete the report
            const deleteReport = db.prepare('DELETE FROM reports WHERE id = ?');
            const result = deleteReport.run(id);

            return result.changes > 0;
        });
    }
}
