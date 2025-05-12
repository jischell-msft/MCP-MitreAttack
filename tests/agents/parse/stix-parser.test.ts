import { StixParser } from '../../../src/agents/parse/stix-parser';

describe('StixParser', () => {
    const mockBundle = {
        type: 'bundle',
        id: 'bundle--test',
        spec_version: '2.0',
        objects: [
            {
                id: 'attack-pattern--test-1',
                type: 'attack-pattern',
                name: 'Test Technique',
                description: 'This is a test technique',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1234',
                        url: 'https://attack.mitre.org/techniques/T1234'
                    }
                ],
                created: '2020-01-01T00:00:00.000Z',
                modified: '2020-01-01T00:00:00.000Z',
                x_mitre_platforms: ['Windows', 'Linux'],
                x_mitre_data_sources: ['Process monitoring', 'File monitoring'],
                x_mitre_detection: 'Look for suspicious activity',
                kill_chain_phases: [
                    {
                        kill_chain_name: 'mitre-attack',
                        phase_name: 'execution'
                    },
                    {
                        kill_chain_name: 'mitre-attack',
                        phase_name: 'persistence'
                    }
                ]
            },
            {
                id: 'attack-pattern--test-2',
                type: 'attack-pattern',
                name: 'Test Subtechnique',
                description: 'This is a test subtechnique',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1234.001',
                        url: 'https://attack.mitre.org/techniques/T1234/001'
                    }
                ],
                created: '2020-01-01T00:00:00.000Z',
                modified: '2020-01-01T00:00:00.000Z'
            },
            {
                id: 'x-mitre-tactic--test-1',
                type: 'x-mitre-tactic',
                name: 'Execution',
                x_mitre_shortname: 'execution',
                description: 'The execution tactic'
            },
            {
                id: 'course-of-action--test-1',
                type: 'course-of-action',
                name: 'Test Mitigation',
                description: 'This is a test mitigation',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'M1234',
                        url: 'https://attack.mitre.org/mitigations/M1234'
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

    it('should validate a STIX bundle', () => {
        expect(StixParser.validateBundle(mockBundle)).toBe(true);
        expect(StixParser.validateBundle({})).toBe(false);
        expect(StixParser.validateBundle({ type: 'not-bundle' })).toBe(false);
    });

    it('should extract version from MITRE data', () => {
        const withVersion = {
            objects: [
                {
                    type: 'x-mitre-collection',
                    x_mitre_version: '13.1'
                }
            ]
        };

        expect(StixParser.extractVersion(withVersion)).toBe('13.1');
        expect(StixParser.extractVersion(mockBundle)).toBe('STIX-2.0');
    });

    it('should extract attack patterns', () => {
        const patterns = StixParser.extractAttackPatterns(mockBundle);
        expect(patterns).toHaveLength(2);
        expect(patterns[0].name).toBe('Test Technique');
        expect(patterns[1].name).toBe('Test Subtechnique');
    });

    it('should extract relationships', () => {
        const relationships = StixParser.extractRelationships(mockBundle);
        expect(relationships).toHaveLength(2);
        expect(relationships[0].relationship_type).toBe('subtechnique-of');
        expect(relationships[1].relationship_type).toBe('mitigates');
    });

    it('should extract tactics', () => {
        const tactics = StixParser.extractTactics(mockBundle);
        expect(tactics.size).toBe(1);
        expect(tactics.get('x-mitre-tactic--test-1')).toBe('execution');
    });

    it('should extract mitigations', () => {
        const mitigations = StixParser.extractMitigations(mockBundle);
        expect(mitigations.size).toBe(1);
        const mitigation = mitigations.get('course-of-action--test-1');
        expect(mitigation?.name).toBe('Test Mitigation');
        expect(mitigation?.id).toBe('M1234');
    });

    it('should build subtechnique map', () => {
        const relationships = StixParser.extractRelationships(mockBundle);
        const subtechMap = StixParser.buildSubtechniqueMap(relationships);
        expect(subtechMap.size).toBe(1);
        expect(subtechMap.get('attack-pattern--test-1')).toContain('attack-pattern--test-2');
    });

    it('should build mitigation map', () => {
        const relationships = StixParser.extractRelationships(mockBundle);
        const mitigationMap = StixParser.buildMitigationMap(relationships);
        expect(mitigationMap.size).toBe(1);
        expect(mitigationMap.get('attack-pattern--test-1')).toContain('course-of-action--test-1');
    });

    it('should build tactic map', () => {
        const attackPatterns = StixParser.extractAttackPatterns(mockBundle);
        const tacticMap = StixParser.buildTacticMap(attackPatterns);
        expect(tacticMap.size).toBe(1);
        expect(tacticMap.get('attack-pattern--test-1')).toContain('execution');
        expect(tacticMap.get('attack-pattern--test-1')).toContain('persistence');
    });

    it('should extract technique URL', () => {
        const attackPatterns = StixParser.extractAttackPatterns(mockBundle);
        const url = StixParser.extractTechniqueUrl(attackPatterns[0]);
        expect(url).toBe('https://attack.mitre.org/techniques/T1234');
    });

    it('should extract technique ID', () => {
        const attackPatterns = StixParser.extractAttackPatterns(mockBundle);
        const id = StixParser.extractTechniqueId(attackPatterns[0]);
        expect(id).toBe('T1234');
    });
});
