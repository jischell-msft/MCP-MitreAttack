import { getDatabase, closeDatabase } from '../../src/db/connection';
import { ReportRepository } from '../../src/db/repositories/report-repository';
import { Report } from '../../src/models/report';
import path from 'path';
import fs from 'fs';

// Use in-memory database for tests
jest.mock('../../src/config', () => ({
    DB_CONFIG: {
        path: ':memory:',
        debug: false,
        migrationDir: path.join(process.cwd(), 'src', 'db', 'migrations'),
        schemaPath: path.join(process.cwd(), 'src', 'db', 'schema.sql')
    }
}));

describe('ReportRepository', () => {
    let repository: ReportRepository;

    beforeAll(() => {
        const db = getDatabase();

        // Create tables for testing
        const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);

        repository = new ReportRepository();
    });

    afterAll(() => {
        closeDatabase();
    });

    it('should create a report', () => {
        const report: Report = {
            id: 'test-report-1',
            workflowId: 'workflow-1',
            createdAt: new Date(),
            mitreVersion: '13.1',
            summary: {
                matchCount: 5,
                highConfidenceCount: 3,
                tacticsBreakdown: {
                    'initial-access': 2,
                    'execution': 3
                },
                topTechniques: [
                    { id: 'T1566', name: 'Phishing', score: 0.9 }
                ],
                keyFindings: ['Potential phishing attack detected']
            }
        };

        const id = repository.create(report);

        expect(id).toBe('test-report-1');

        const retrieved = repository.findById(id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe('test-report-1');
        expect(retrieved?.workflowId).toBe('workflow-1');
    });

    it('should update a report', () => {
        const updateResult = repository.update('test-report-1', {
            summary: {
                matchCount: 10,
                highConfidenceCount: 5,
                tacticsBreakdown: {
                    'initial-access': 4,
                    'execution': 6
                },
                topTechniques: [
                    { id: 'T1566', name: 'Phishing', score: 0.95 }
                ],
                keyFindings: ['Updated findings']
            }
        });

        expect(updateResult).toBe(true);

        const retrieved = repository.findById('test-report-1');
        expect(retrieved?.summary.matchCount).toBe(10);
        expect(retrieved?.summary.keyFindings[0]).toBe('Updated findings');
    });

    it('should find reports with pagination', () => {
        // Add more test reports
        for (let i = 2; i <= 10; i++) {
            repository.create({
                id: `test-report-${i}`,
                workflowId: `workflow-${i}`,
                createdAt: new Date(),
                mitreVersion: '13.1',
                summary: {
                    matchCount: i,
                    highConfidenceCount: Math.floor(i / 2),
                    tacticsBreakdown: { 'execution': i },
                    topTechniques: [],
                    keyFindings: []
                }
            });
        }

        const result = repository.findReports({ page: 1, limit: 5 });

        expect(result.reports.length).toBe(5);
        expect(result.total).toBe(10);
    });

    it('should delete a report', () => {
        const deleteResult = repository.delete('test-report-10');
        expect(deleteResult).toBe(true);

        const retrieved = repository.findById('test-report-10');
        expect(retrieved).toBeNull();
    });
});
