import fs from 'fs/promises';
import path from 'path';
import { WorkflowEngine } from './workflow-engine';
import { Logger } from '../utils/logger';
import { Database } from 'better-sqlite3';
import { documentAnalysisWorkflow } from './document-workflow';

const logger = new Logger('WorkflowTesting');

/**
 * Creates a test document containing references to specific MITRE techniques
 * @param techniques Array of MITRE technique IDs to include in the document
 * @returns Path to the created test file
 */
export async function createTestDocument(techniques: string[]): Promise<string> {
    // Map of technique IDs to sample text mentioning them
    const techniqueText: Record<string, string> = {
        'T1566': 'The attack began with a sophisticated phishing email that appeared to come from the IT department, asking users to verify their credentials.',
        'T1078': 'After obtaining valid credentials, the attacker logged in using these legitimate accounts to avoid detection and maintain persistence.',
        'T1486': 'The ransomware then began encrypting files across the network, leaving ransom notes demanding payment for decryption keys.',
        'T1027': 'The malware used obfuscation techniques to hide its true purpose and evade detection by security tools.',
        'T1059': 'The attacker used PowerShell commands to execute malicious code that established a backdoor connection.',
        'T1036': 'To maintain access, they disguised their backdoor as a legitimate system service to masquerade their presence.',
        'T1057': 'The malware enumerated running processes to identify security tools that should be avoided or disabled.',
        'T1083': 'Once active, the malware performed file discovery to locate valuable data for exfiltration.'
    };

    // Create test document content
    let documentContent = 'Security Incident Analysis Report\n\n';
    documentContent += 'Executive Summary:\n';
    documentContent += 'On January 15, 2023, our security team detected unauthorized access to our network. ';
    documentContent += 'The following analysis details the methods used by the threat actor.\n\n';
    documentContent += 'Detailed Analysis:\n\n';

    // Add paragraphs for each specified technique
    for (const techniqueId of techniques) {
        const text = techniqueText[techniqueId] ||
            `The attacker used ${techniqueId} technique to compromise the system.`;
        documentContent += `${text}\n\n`;
    }

    // Add some generic content
    documentContent += 'Recommendations:\n';
    documentContent += '1. Implement multi-factor authentication\n';
    documentContent += '2. Enhance employee security awareness training\n';
    documentContent += '3. Update all endpoint protection solutions\n';

    // Write to temporary file
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });

    const filePath = path.join(tempDir, `test-document-${Date.now()}.txt`);
    await fs.writeFile(filePath, documentContent, 'utf8');

    return filePath;
}

/**
 * Runs an integration test for the complete workflow
 */
export async function testDocumentAnalysisWorkflow(
    db: Database,
    techniqueIds: string[] = ['T1566', 'T1078', 'T1486']
): Promise<void> {
    logger.info('Starting document analysis workflow test');

    // Create test document with known MITRE techniques
    const testDocPath = await createTestDocument(techniqueIds);
    logger.info(`Created test document at ${testDocPath}`);

    try {
        // Initialize workflow engine
        const engine = new WorkflowEngine(db, logger);
        engine.registerWorkflow(documentAnalysisWorkflow);

        // Execute workflow
        logger.info('Executing document analysis workflow');
        const result = await engine.executeWorkflow('document-analysis', {
            documentPath: testDocPath,
            documentName: 'test-document.txt'
        });

        // Verify workflow completed successfully
        if (result.status !== 'completed') {
            throw new Error(`Workflow did not complete successfully: ${result.status}`);
        }
        logger.info('Workflow completed successfully');

        // Check for expected matches
        const reportResult = result.results['generate-report'];
        const matches = reportResult.report.detailedMatches;

        // Verify all expected techniques were found
        for (const techniqueId of techniqueIds) {
            const found = matches.some(m => m.techniqueId === techniqueId);
            if (!found) {
                logger.warn(`Expected technique ${techniqueId} was not found in matches`);
            } else {
                logger.info(`Found expected technique ${techniqueId}`);
            }
        }

        // Check confidence scores
        for (const match of matches) {
            if (techniqueIds.includes(match.techniqueId)) {
                logger.info(`Technique ${match.techniqueId} confidence: ${match.confidenceScore}`);
            }
        }

        // Verify report structure
        if (!reportResult.reportId) {
            throw new Error('Report ID is missing');
        }

        logger.info(`Generated report ID: ${reportResult.reportId}`);
        logger.info(`Match count: ${reportResult.report.summary.matchCount}`);
        logger.info(`MITRE version: ${reportResult.report.mitreDatabaseVersion}`);

        logger.info('Workflow test passed successfully');

        return reportResult;
    } catch (error) {
        logger.error('Workflow test failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        // Clean up test document
        try {
            await fs.unlink(testDocPath);
            logger.info(`Cleaned up test document at ${testDocPath}`);
        } catch (error) {
            logger.warn(`Failed to clean up test document: ${error.message}`);
        }
    }
}
