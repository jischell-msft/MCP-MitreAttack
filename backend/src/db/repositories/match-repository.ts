import { BaseRepository } from './base-repository';
import { executeTransaction } from '../connection';
import { Match } from '../../models/match';

export class MatchRepository extends BaseRepository<Match> {
    constructor() {
        super('matches', 'id');
    }

    /**
     * Create a new match
     */
    create(match: Match): string {
        try {
            const result = this.db.prepare(`
        INSERT INTO matches (
          report_id, technique_id, technique_name, confidence_score, context_text
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
                match.reportId,
                match.techniqueId,
                match.techniqueName,
                match.confidenceScore,
                match.contextText || null
            );

            return result.lastInsertRowid.toString();
        } catch (error) {
            console.error(`Error creating match: ${error}`);
            throw error;
        }
    }

    /**
     * Update an existing match
     */
    update(id: string, matchData: Partial<Match>): boolean {
        try {
            const setFields: string[] = [];
            const params: any[] = [];

            if (matchData.confidenceScore !== undefined) {
                setFields.push('confidence_score = ?');
                params.push(matchData.confidenceScore);
            }

            if (matchData.contextText !== undefined) {
                setFields.push('context_text = ?');
                params.push(matchData.contextText);
            }

            if (setFields.length === 0) {
                return true; // Nothing to update
            }

            params.push(parseInt(id, 10));

            const query = `UPDATE matches SET ${setFields.join(', ')} WHERE id = ?`;
            const result = this.db.prepare(query).run(...params);

            return result.changes > 0;
        } catch (error) {
            console.error(`Error updating match: ${error}`);
            return false;
        }
    }

    /**
     * Find matches by report ID
     */
    findByReportId(reportId: string): Match[] {
        try {
            const query = 'SELECT * FROM matches WHERE report_id = ? ORDER BY confidence_score DESC';
            const matches = this.db.prepare(query).all(reportId) as any[];

            return matches.map(match => ({
                id: match.id.toString(),
                reportId: match.report_id,
                techniqueId: match.technique_id,
                techniqueName: match.technique_name,
                confidenceScore: match.confidence_score,
                contextText: match.context_text
            }));
        } catch (error) {
            console.error(`Error finding matches by report ID: ${error}`);
            return [];
        }
    }

    /**
     * Find matches by technique ID
     */
    findByTechniqueId(techniqueId: string): Match[] {
        try {
            const query = 'SELECT * FROM matches WHERE technique_id = ? ORDER BY confidence_score DESC';
            const matches = this.db.prepare(query).all(techniqueId) as any[];

            return matches.map(match => ({
                id: match.id.toString(),
                reportId: match.report_id,
                techniqueId: match.technique_id,
                techniqueName: match.technique_name,
                confidenceScore: match.confidence_score,
                contextText: match.context_text
            }));
        } catch (error) {
            console.error(`Error finding matches by technique ID: ${error}`);
            return [];
        }
    }

    /**
     * Delete matches by report ID
     */
    deleteByReportId(reportId: string): boolean {
        try {
            const result = this.db.prepare('DELETE FROM matches WHERE report_id = ?').run(reportId);
            return result.changes > 0;
        } catch (error) {
            console.error(`Error deleting matches by report ID: ${error}`);
            return false;
        }
    }

    /**
     * Batch insert matches for a report
     */
    batchInsertMatches(matches: Match[]): boolean {
        if (matches.length === 0) {
            return true;
        }

        return executeTransaction(db => {
            const insert = db.prepare(`
        INSERT INTO matches (report_id, technique_id, technique_name, confidence_score, context_text)
        VALUES (?, ?, ?, ?, ?)
      `);

            for (const match of matches) {
                insert.run(
                    match.reportId,
                    match.techniqueId,
                    match.techniqueName,
                    match.confidenceScore,
                    match.contextText || null
                );
            }

            return true;
        });
    }
}
