import { ParseAgent } from '../../../src/agents/parse';

describe('ParseAgent', () => {
    let parseAgent: ParseAgent;

    // Mock minimal STIX bundle for testing
    const mockBundle = {
        type: 'bundle',
        id: 'bundle--test',
        spec_version: '2.0',
        objects: [
            {
                id: 'attack-pattern--test-1',
                type: 'attack-pattern',
                name: 'Phishing',
                description: 'Phishing is a technique used to steal credentials through deceptive emails.',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1566',
                        url: 'https://attack.mitre.org/techniques/T1566'
                    }
                ],
                created: '2020-01-01T00:00:00.000Z',
                modified: '2020-01-01T00:00:00.000Z',
                x_mitre_platforms: ['Windows', 'macOS', 'Linux'],
                x_mitre_data_sources: ['Email gateway', 'User reports'],
                x_mitre_detection: 'Monitor for suspicious emails',
                kill_chain_phases: [
                    {
                        kill_chain_name: 'mitre-attack',
                        phase_name: 'initial-access'
                    }
                ]
            },
            {
                id: 'attack-pattern--test-2',
                type: 'attack-pattern',
                name: 'Spearphishing Attachment',
                description: 'Spearphishing with malicious attachments is a specific variant of phishing.',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1566.001',
                        url: 'https://attack.mitre.org/techniques/T1566/001'
                    }
                ],
                created: '2020-01-01T00:00:00.000Z',
                modified: '2020-01-01T00:00:00.000Z',
                x_mitre_platforms: ['Windows'],
                kill_chain_phases: [
                    {
                        kill_chain_name: 'mitre-attack',
                        phase_name: 'initial-access'
                    }
                ]
            },
            {
                id: 'attack-pattern--test-3',
                type: 'attack-pattern',
                name: 'Credential Dumping',
                description: 'Adversaries may attempt to extract credentials from the operating system.',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1003',
                        url: 'https://attack.mitre.org/techniques/T1003'
                    }
                ],
                created: '2020-01-01T00:00:00.000Z',
                modified: '2020-01-01T00:00:00.000Z',
                x_mitre_platforms: ['Windows'],
                kill_chain_phases: [
                    {
                        kill_chain_name: 'mitre-attack',
                        phase_name: 'credential-access'
                    }
                ]
            },
            {
                id: 'x-mitre-tactic--test-1',
                type: 'x-mitre-tactic',
                name: 'Initial Access',
                x_mitre_shortname: 'initial-access',
                description: 'The initial access tactic'
            },
            {
                id: 'x-mitre-tactic--test-2',
                type: 'x-mitre-tactic',
                name: 'Credential Access',
                x_mitre_shortname: 'credential-access',
                description: 'The credential access tactic'
            },
            {
                id: 'course-of-action--test-1',
                type: 'course-of-action',
                name: 'User Training',
                description: 'Train users to identify phishing attempts',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'M1017',
                        url: 'https://attack.mitre.org/mitigations/M1017'
                    }
                ]
            },
            {
                id: 'relationship--test-1',
                type: 'relationship',
                relationship_type: 'subtechnique-of',
                source_ref: 'attack-pattern--test-2',
                target_ref: 'attack-pattern--test-1'
            },
            {
                id: 'relationship--test-2',
                type: 'relationship',
                relationship_type: 'mitigates',
                source_ref: 'course-of-action--test-1',
                target_ref: 'attack-pattern--test-1'
            }
        ]
    };

    beforeEach(async () => {
        parseAgent = new ParseAgent({
            includeSubtechniques: true,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true
        });

        await parseAgent.initialize();
    });

    it('should initialize correctly', () => {
        expect(parseAgent.getName()).toBe('ParseAgent');
        expect(parseAgent.getVersion()).toBe('1.0.0');
    });

    it('should parse MITRE ATT&CK data successfully', async () => {
        const result = await parseAgent.parse(mockBundle);

        // Check overall result
        expect(result.techniques).toHaveLength(3);
        expect(result.version).toBe('STIX-2.0');
        expect(result.techniqueIndex.size).toBe(5); // 3 techniques + 2 by external ID
        expect(result.tacticMap.size).toBe(2); // initial-access and credential-access
    });

    it('should correctly build parent-child relationships', async () => {
        const result = await parseAgent.parse(mockBundle);

        const phishing = result.techniqueIndex.get('T1566');
        expect(phishing).toBeDefined();
        expect(phishing?.subtechniques).toHaveLength(1);
        expect(phishing?.subtechniques?.[0].id).toBe('T1566.001');

        const spearphishing = result.techniqueIndex.get('T1566.001');
        expect(spearphishing).toBeDefined();
        expect(spearphishing?.parent).toBe('attack-pattern--test-1');
    });

    it('should correctly extract mitigations', async () => {
        const result = await parseAgent.parse(mockBundle);

        const phishing = result.techniqueIndex.get('T1566');
        expect(phishing).toBeDefined();
        expect(phishing?.mitigations).toHaveLength(1);
        expect(phishing?.mitigations[0].name).toBe('User Training');
    });

    it('should find techniques by ID', async () => {
        await parseAgent.parse(mockBundle);

        const technique = parseAgent.findTechniqueById('T1566');
        expect(technique).toBeDefined();
        expect(technique?.name).toBe('Phishing');

        const notFound = parseAgent.findTechniqueById('T9999');
        expect(notFound).toBeNull();
    });

    it('should search techniques by text', async () => {
        await parseAgent.parse(mockBundle);

        // Search by name
        const phishingResults = parseAgent.searchTechniques('phishing');
        expect(phishingResults).toHaveLength(2);
        expect(phishingResults[0].id).toBe('T1566');

        // Search by description content
        const credentialResults = parseAgent.searchTechniques('credential');
        expect(credentialResults).toHaveLength(1);
        expect(credentialResults[0].id).toBe('T1003');

        // Search with multiple terms
        const multiResults = parseAgent.searchTechniques('phishing attachment');
        expect(multiResults).toHaveLength(2);
        expect(multiResults[0].id).toBe('T1566.001'); // More specific match first
    });

    it('should filter techniques by criteria', async () => {
        await parseAgent.parse(mockBundle);

        // Filter by tactic
        const initialAccessTechniques = parseAgent.filterTechniques({
            tactics: ['initial-access']
        });
        expect(initialAccessTechniques).toHaveLength(2);

        // Filter by platform
        const windowsTechniques = parseAgent.filterTechniques({
            platforms: ['Windows']
        });
        expect(windowsTechniques).toHaveLength(3);

        // Filter by platform - specific
        const macOSTechniques = parseAgent.filterTechniques({
            platforms: ['macOS']
        });
        expect(macOSTechniques).toHaveLength(1);
        expect(macOSTechniques[0].id).toBe('T1566');

        // Combined filters
        const combined = parseAgent.filterTechniques({
            tactics: ['credential-access'],
            platforms: ['Windows']
        });
        expect(combined).toHaveLength(1);
        expect(combined[0].id).toBe('T1003');
    });

    it('should respect configuration options', async () => {
        // Create agent without subtechniques
        const noSubtechniquesAgent = new ParseAgent({
            includeSubtechniques: false,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true
        });

        await noSubtechniquesAgent.initialize();
        const result = await noSubtechniquesAgent.parse(mockBundle);

        // Should only have parent techniques
        expect(result.techniques.length).toBeLessThan(3);
        const phishing = result.techniqueIndex.get('T1566');
        expect(phishing).toBeDefined();
        expect(phishing?.subtechniques).toBeUndefined();
    });
});
