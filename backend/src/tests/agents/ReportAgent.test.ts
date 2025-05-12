import { ReportAgent, EvalResult, DocumentInfo } from '../../agents/ReportAgent';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// In-memory database for testing
const db = new Database(':memory:');

describe('ReportAgent', () => {
    let reportAgent: ReportAgent;

    beforeAll(async () => {
        // Set up test database schema
        const schemaPath = path.join(__dirname, '../../db/schema.sql');

        // Check if schema file exists
        if (existsSync(schemaPath)) {
            const schema = await fs.readFile(schemaPath, 'utf8');
            db.exec(schema);
        } else {
            // If schema file doesn't exist, create minimal schema for testing
            db.exec(`
        CREATE TABLE reports (
          id TEXT PRIMARY KEY,
          workflow_id TEXT,
          url TEXT,
          created_at DATETIME NOT NULL,
          mitre_version TEXT NOT NULL,
          summary_data TEXT
        );
        
        CREATE TABLE matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id TEXT NOT NULL,
          technique_id TEXT NOT NULL,
          technique_name TEXT NOT NULL,
          confidence_score REAL NOT NULL,
          context_text TEXT,
          FOREIGN KEY(report_id) REFERENCES reports(id)
        );
      `);
        }

        // Initialize ReportAgent with test database
        reportAgent = new ReportAgent({}, db);
        await reportAgent.initialize();
    });

    afterAll(() => {
        // Close database connection
        db.close();
    });

    // Sample test data
    const mockEvalResult: EvalResult = {
        matches: [
            {
                techniqueId: 'T1566',
                techniqueName: 'Phishing',
                confidenceScore: 95,
                matchedText: 'The attackers used phishing emails with malicious attachments.',
                context: 'The attackers used phishing emails with malicious attachments to gain initial access to the network.',
                textPosition: { startChar: 16, endChar: 62 },
                matchSource: 'azure-openai'
            },
            {
                techniqueId: 'T1078',
                techniqueName: 'Valid Accounts',
                confidenceScore: 85,
                matchedText: 'After gaining access, they used compromised admin credentials.',
                context: 'After gaining access, they used compromised admin credentials to move laterally through the network.',
                textPosition: { startChar: 20, endChar: 55 },
                matchSource: 'keyword-match'
            },
            {
                techniqueId: 'T1486',
                techniqueName: 'Data Encrypted for Impact',
                confidenceScore: 70,
                matchedText: 'The final stage involved encrypting valuable data.',
                context: 'The final stage involved encrypting valuable data and demanding a ransom payment.',
                textPosition: { startChar: 22, endChar: 51 },
                matchSource: 'azure-openai'
            }
        ],
        summary: {
            documentId: 'test-doc-123',
            matchCount: 3,
            topTechniques: ['T1566', 'T1078', 'T1486'],
            tacticsCoverage: {
                'initial-access': 1,
                'defense-evasion': 1,
                'impact': 1
            },
            azureOpenAIUsed: true,
            processingTimeMs: 1500
        }
    };

    const mockDocumentInfo: DocumentInfo = {
        url: 'https://example.com/test-document',
        filename: 'test-document.pdf',
        metadata: {
            workflowId: 'wf-123',
            contentType: 'application/pdf',
            pages: 5
        }
    };

    test('should generate a report from evaluation results', async () => {
        const report = await reportAgent.generateReport(mockEvalResult, mockDocumentInfo);

        expect(report).toBeDefined();
        expect(report.id).toBeDefined();
        expect(report.timestamp).toBeInstanceOf(Date);
        expect(report.source.url).toBe('https://example.com/test-document');
        expect(report.source.filename).toBe('test-document.pdf');
        expect(report.summary.matchCount).toBe(3);
        expect(report.summary.highConfidenceCount).toBe(2);
        expect(report.summary.keyFindings.length).toBeGreaterThan(0);
        expect(report.detailedMatches).toHaveLength(3);
    });

    test('should save and retrieve a report', async () => {
        // Generate report
        const report = await reportAgent.generateReport(mockEvalResult, mockDocumentInfo);
        report.mitreDatabaseVersion = 'v13.0';

        // Save report
        const reportId = await reportAgent.saveReport(report);

        // Retrieve report
        const retrievedReport = await reportAgent.getReportById(reportId);

        expect(retrievedReport).toBeDefined();
        expect(retrievedReport!.id).toBe(reportId);
        expect(retrievedReport!.mitreDatabaseVersion).toBe('v13.0');
        expect(retrievedReport!.detailedMatches).toHaveLength(3);
    });

    test('should search reports with filters', async () => {
        // Generate and save additional test reports
        const report1 = await reportAgent.generateReport(mockEvalResult, {
            url: 'https://example.com/report1',
            metadata: { workflowId: 'wf-456' }
        });
        report1.mitreDatabaseVersion = 'v13.0';
        await reportAgent.saveReport(report1);

        const report2 = await reportAgent.generateReport(mockEvalResult, {
            url: 'https://example.org/report2',
            metadata: { workflowId: 'wf-789' }
        });
        report2.mitreDatabaseVersion = 'v13.0';
        await reportAgent.saveReport(report2);

        // Search for reports
        const searchResult = await reportAgent.searchReports({
            page: 1,
            limit: 10
        });

        expect(searchResult.reports).toBeDefined();
        expect(searchResult.reports.length).toBeGreaterThanOrEqual(3);
        expect(searchResult.pagination.total).toBeGreaterThanOrEqual(3);
    });

    test('should delete a report', async () => {
        // Generate and save a report
        const report = await reportAgent.generateReport(mockEvalResult, {
            url: 'https://example.com/to-delete',
            metadata: { workflowId: 'wf-delete' }
        });
        report.mitreDatabaseVersion = 'v13.0';

        const reportId = await reportAgent.saveReport(report);

        // Verify report exists
        const retrievedBefore = await reportAgent.getReportById(reportId);
        expect(retrievedBefore).toBeDefined();

        // Delete report
        const deleted = await reportAgent.deleteReport(reportId);
        expect(deleted).toBe(true);

        // Verify report is gone
        const retrievedAfter = await reportAgent.getReportById(reportId);
        expect(retrievedAfter).toBeNull();
    });

    test('should export report in different formats', async () => {
        // Generate and save a report
        const report = await reportAgent.generateReport(mockEvalResult, mockDocumentInfo);
        report.mitreDatabaseVersion = 'v13.0';

        const reportId = await reportAgent.saveReport(report);

        // Test JSON export
        const jsonExport = await reportAgent.exportReport(reportId, 'json');
        expect(jsonExport).toBeInstanceOf(Buffer);
        expect(jsonExport.length).toBeGreaterThan(0);

        // Parse JSON to verify content
        const jsonContent = JSON.parse(jsonExport.toString('utf8'));
        expect(jsonContent.id).toBe(reportId);
        expect(jsonContent.detailedMatches).toHaveLength(3);

        // Test CSV export
        const csvExport = await reportAgent.exportReport(reportId, 'csv');
        expect(csvExport).toBeInstanceOf(Buffer);
        expect(csvExport.length).toBeGreaterThan(0);

        // Check CSV content
        const csvContent = csvExport.toString('utf8');
        expect(csvContent).toContain('Technique ID');
        expect(csvContent).toContain('T1566');
    });
});
