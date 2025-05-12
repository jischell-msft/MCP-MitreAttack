import { EvalAgent } from '../EvalAgent';
import { TechniqueModel } from '../../parseAgent/models/types';

describe('EvalAgent', () => {
    let evalAgent: EvalAgent;

    // Sample MITRE techniques for testing
    const sampleTechniques: TechniqueModel[] = [
        {
            id: 'T1566',
            name: 'Phishing',
            description: 'Adversaries may send phishing emails with malicious attachments or links.',
            tactics: ['initial-access'],
            keywords: ['phish', 'spearphishing', 'email']
        },
        {
            id: 'T1078',
            name: 'Valid Accounts',
            description: 'Adversaries may obtain and abuse credentials of existing accounts.',
            tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
            keywords: ['account', 'credential', 'login']
        },
        {
            id: 'T1486',
            name: 'Data Encrypted for Impact',
            description: 'Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability.',
            tactics: ['impact'],
            keywords: ['ransomware', 'encrypt', 'cryptolocker']
        }
    ];

    beforeEach(async () => {
        // Create EvalAgent with test configuration
        evalAgent = new EvalAgent({
            minConfidenceScore: 50,
            maxMatches: 10,
            contextWindowSize: 200,
            useKeywordMatching: true,
            useTfIdfMatching: true,
            useFuzzyMatching: true
        });

        // Initialize with sample techniques
        await evalAgent.initialize(sampleTechniques);
    });

    test('should initialize properly', () => {
        expect(evalAgent).toBeDefined();
    });

    test('should identify phishing technique in text', async () => {
        const text = 'The organization was compromised after an employee opened a phishing email with a malicious attachment.';

        const result = await evalAgent.evaluate(text, 'test-doc');

        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.matches.some(m => m.techniqueId === 'T1566')).toBe(true);
    });

    test('should identify valid accounts technique in text', async () => {
        const text = 'The attacker used stolen credentials to log into the admin account and escalate privileges.';

        const result = await evalAgent.evaluate(text, 'test-doc');

        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.matches.some(m => m.techniqueId === 'T1078')).toBe(true);
    });

    test('should identify ransomware technique in text', async () => {
        const text = 'All company files were encrypted by ransomware and a bitcoin payment was demanded.';

        const result = await evalAgent.evaluate(text, 'test-doc');

        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.matches.some(m => m.techniqueId === 'T1486')).toBe(true);
    });

    test('should handle empty documents', async () => {
        const result = await evalAgent.evaluate('', 'empty-doc');

        expect(result.matches).toHaveLength(0);
        expect(result.summary.matchCount).toBe(0);
    });

    test('should extract proper context around matches', async () => {
        const text = 'First section of text.\n\nThe organization was compromised after an employee opened a phishing email with a malicious attachment.\n\nAnother section of text.';

        const result = await evalAgent.evaluate(text, 'test-doc');

        const phishingMatch = result.matches.find(m => m.techniqueId === 'T1566');
        expect(phishingMatch).toBeDefined();
        if (phishingMatch) {
            // Context should include the sentence with the match
            expect(phishingMatch.context).toContain('phishing email');
            expect(phishingMatch.context).toContain('compromised');
        }
    });

    test('should assign higher confidence to exact technique matches', async () => {
        const text = 'This document discusses T1566 Phishing attacks and their impact.';

        const result = await evalAgent.evaluate(text, 'test-doc');

        const phishingMatch = result.matches.find(m => m.techniqueId === 'T1566');
        expect(phishingMatch).toBeDefined();
        if (phishingMatch) {
            expect(phishingMatch.confidenceScore).toBeGreaterThan(80);
        }
    });

    test('should process document chunks correctly', async () => {
        const chunk1 = 'The first stage of the attack involved phishing emails sent to employees.';
        const chunk2 = 'In the second stage, the attackers encrypted files for ransom.';

        const results1 = await evalAgent.evaluateChunk(chunk1);
        const results2 = await evalAgent.evaluateChunk(chunk2);

        expect(results1.some(m => m.techniqueId === 'T1566')).toBe(true);
        expect(results2.some(m => m.techniqueId === 'T1486')).toBe(true);
    });

    test('should filter matches based on confidence threshold', async () => {
        // Create agent with high threshold
        const highThresholdAgent = new EvalAgent({
            minConfidenceScore: 90, // Very high threshold
            maxMatches: 10,
            contextWindowSize: 200,
            useKeywordMatching: true,
            useTfIdfMatching: true,
            useFuzzyMatching: true
        });

        await highThresholdAgent.initialize(sampleTechniques);

        const text = 'This email mentions phishing but in a very casual way.';
        const result = await highThresholdAgent.evaluate(text, 'test-doc');

        // Should have fewer or no matches due to high threshold
        expect(result.matches.length).toBeLessThan(2);
    });

    test('should generate accurate tactics coverage in summary', async () => {
        const text = 'The attackers sent phishing emails and then used the stolen credentials to escalate privileges. Finally, they encrypted all the data for ransom.';

        const result = await evalAgent.evaluate(text, 'test-doc');

        expect(result.summary.tacticsCoverage).toBeDefined();
        expect(Object.keys(result.summary.tacticsCoverage).length).toBeGreaterThan(0);

        // Should have matches across different tactics
        expect(result.summary.tacticsCoverage['initial-access']).toBeDefined();
        expect(result.summary.tacticsCoverage['impact']).toBeDefined();
    });
});
