import { AzureEvalAgent } from '../../../src/agents/eval/azure-eval-agent';
import { AzureEval } from '../../../src/agents/eval/azure-eval';
import { TechniqueModel } from '../../../src/agents/parse/types';

// Mock the AzureEval class
jest.mock('../../../src/agents/eval/azure-eval');

// Sample techniques for testing
const mockTechniques: TechniqueModel[] = [
    {
        id: 'T1566',
        name: 'Phishing',
        description: 'Phishing is a technique where adversaries send emails with malicious attachments or links.',
        tactics: ['Initial Access'],
        platforms: ['Windows', 'macOS', 'Linux'],
        dataSources: ['Email logs'],
        detection: 'Monitor for suspicious email patterns',
        mitigations: [],
        url: 'https://attack.mitre.org/techniques/T1566',
        keywords: ['email', 'phishing', 'attachment', 'link'],
        created: '2020-01-01',
        modified: '2020-01-01'
    },
    {
        id: 'T1078',
        name: 'Valid Accounts',
        description: 'Adversaries may steal or obtain legitimate credentials to gain initial access.',
        tactics: ['Initial Access', 'Persistence', 'Privilege Escalation'],
        platforms: ['Windows', 'macOS', 'Linux'],
        dataSources: ['Authentication logs'],
        detection: 'Monitor for unusual authentication patterns',
        mitigations: [],
        url: 'https://attack.mitre.org/techniques/T1078',
        keywords: ['credentials', 'account', 'login', 'authentication'],
        created: '2020-01-01',
        modified: '2020-01-01'
    }
];

describe('AzureEvalAgent', () => {
    let agent: AzureEvalAgent;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create agent with mocked Azure OpenAI config
        agent = new AzureEvalAgent({
            azureOpenAI: {
                useAzureOpenAI: true,
                endpoint: 'https://test-endpoint.com',
                apiKey: 'test-key',
                deploymentName: 'gpt-4',
                apiVersion: '2023-05-15',
                maxTokens: 4000,
                temperature: 0.1,
                timeout: 30000,
                retryCount: 3
            }
        });
    });

    test('should initialize correctly', async () => {
        await agent.initialize(mockTechniques);
        expect(agent.getName()).toBe('AzureEvalAgent');
        expect(agent.getVersion()).toBe('1.0.0');
    });

    test('should use Azure OpenAI when available', async () => {
        // Setup mock implementation
        const mockResult = {
            matches: [
                {
                    techniqueId: 'T1566',
                    techniqueName: 'Phishing',
                    confidenceScore: 90,
                    matchedText: 'sent a malicious email attachment',
                    context: 'Document describes phishing attack',
                    textPosition: { startChar: 0, endChar: 0 }
                }
            ],
            summary: {
                documentId: '',
                matchCount: 1,
                topTechniques: ['T1566'],
                tacticsCoverage: { 'Initial Access': 1 },
                azureOpenAIUsed: true,
                processingTimeMs: 500
            }
        };

        (AzureEval.prototype.evaluate as jest.Mock).mockResolvedValue(mockResult);

        // Initialize and evaluate
        await agent.initialize(mockTechniques);
        const result = await agent.evaluate('This document contains details about an incident where an attacker sent a malicious email attachment.');

        // Verify Azure OpenAI was used
        expect(AzureEval.prototype.evaluate).toHaveBeenCalled();
        expect(result.matches.length).toBe(1);
        expect(result.matches[0].techniqueId).toBe('T1566');
        expect(result.summary.azureOpenAIUsed).toBe(true);
    });

    test('should fall back to local processing when Azure OpenAI fails', async () => {
        // Setup mock to throw an error
        (AzureEval.prototype.evaluate as jest.Mock).mockRejectedValue(new Error('Azure OpenAI error'));

        // Initialize and evaluate
        await agent.initialize(mockTechniques);
        const result = await agent.evaluate('This document contains details about an incident where an attacker sent a malicious email attachment.');

        // Verify fallback worked and local processing was used
        expect(AzureEval.prototype.evaluate).toHaveBeenCalled();
        expect(result.summary.azureOpenAIUsed).toBe(false);
        expect(result.matches.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty documents correctly', async () => {
        await agent.initialize(mockTechniques);
        const result = await agent.evaluate('');

        expect(result.matches).toHaveLength(0);
        expect(result.summary.matchCount).toBe(0);
    });

    test('should evaluate document chunks', async () => {
        // Setup mock implementation
        const mockResult = {
            matches: [
                {
                    techniqueId: 'T1566',
                    techniqueName: 'Phishing',
                    confidenceScore: 90,
                    matchedText: 'sent a malicious email attachment',
                    context: 'Document describes phishing attack',
                    textPosition: { startChar: 0, endChar: 0 }
                }
            ],
            summary: {
                documentId: '',
                matchCount: 1,
                topTechniques: ['T1566'],
                tacticsCoverage: { 'Initial Access': 1 },
                azureOpenAIUsed: true,
                processingTimeMs: 500
            }
        };

        (AzureEval.prototype.evaluate as jest.Mock).mockResolvedValue(mockResult);

        // Initialize and evaluate chunk
        await agent.initialize(mockTechniques);
        const matches = await agent.evaluateChunk('This is a document chunk about phishing.');

        expect(matches).toHaveLength(1);
        expect(matches[0].techniqueId).toBe('T1566');
    });
});
