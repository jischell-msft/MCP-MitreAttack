import { ParseAgent } from '../../../src/agents/ParseAgent';
import { expect } from 'chai';
import { describe, it, before } from 'mocha';

describe('ParseAgent', () => {
    let parseAgent: ParseAgent;
    const sampleStixBundle = {
        type: 'bundle',
        id: 'bundle--example',
        spec_version: '2.0',
        objects: [
            // Sample attack-pattern (technique)
            {
                type: 'attack-pattern',
                id: 'attack-pattern--t1566',
                name: 'Phishing',
                description: 'Phishing is a technique used by attackers to trick users into divulging sensitive information.',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1566',
                        url: 'https://attack.mitre.org/techniques/T1566/'
                    }
                ],
                x_mitre_platforms: ['Windows', 'Linux', 'macOS'],
                x_mitre_data_sources: ['Email Gateway', 'Web Proxy'],
                x_mitre_detection: 'Monitor for suspicious emails and links.',
                kill_chain_phases: [
                    {
                        kill_chain_name: 'mitre-attack',
                        phase_name: 'initial-access'
                    }
                ]
            },
            // Sample sub-technique
            {
                type: 'attack-pattern',
                id: 'attack-pattern--t1566-001',
                name: 'Spearphishing Attachment',
                description: 'Spearphishing attachment is a specific type of phishing that employs the use of malicious attachments.',
                external_references: [
                    {
                        source_name: 'mitre-attack',
                        external_id: 'T1566.001',
                        url: 'https://attack.mitre.org/techniques/T1566/001/'
                    }
                ],
                x_mitre_platforms: ['Windows', 'Linux', 'macOS'],
                x_mitre_data_sources: ['Email Gateway', 'Endpoint Detection'],
                x_mitre_detection: 'Monitor for suspicious email attachments.'
            },
            // Sample tactic
            {
                type: 'x-mitre-tactic',
                id: 'x-mitre-tactic--initial-access',
                name: 'Initial Access',
                description: 'The initial access tactic represents techniques used to gain an initial foothold within a network.',
                x_mitre_shortname: 'initial-access'
            },
            // Sample mitigation
            {
                type: 'course-of-action',
                id: 'course-of-action--m1049',
                name: 'User Training',
                description: 'Train users to identify and report suspected phishing attempts.'
            },
            // Sample relationship (technique to tactic)
            {
                type: 'relationship',
                id: 'relationship--rel-technique-tactic',
                source_ref: 'attack-pattern--t1566',
                target_ref: 'x-mitre-tactic--initial-access',
                relationship_type: 'kill-chain-phase'
            },
            // Sample relationship (sub-technique to parent)
            {
                type: 'relationship',
                id: 'relationship--rel-subtechnique',
                source_ref: 'attack-pattern--t1566-001',
                target_ref: 'attack-pattern--t1566',
                relationship_type: 'subtechnique-of'
            },
            // Sample relationship (mitigation to technique)
            {
                type: 'relationship',
                id: 'relationship--rel-mitigation',
                source_ref: 'course-of-action--m1049',
                target_ref: 'attack-pattern--t1566',
                relationship_type: 'mitigates'
            }
        ]
    };

    before(async () => {
        parseAgent = new ParseAgent({
            includeSubtechniques: true,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true
        });
        await parseAgent.initialize();
    });

    describe('#parse', () => {
        it('should parse a STIX bundle and extract techniques', async () => {
            const result = await parseAgent.parse(sampleStixBundle);
            expect(result.techniques).to.be.an('array');
            expect(result.techniqueIndex).to.be.instanceOf(Map);
            expect(result.tacticMap).to.be.instanceOf(Map);
            expect(result.version).to.equal('2.0');
        });

        it('should extract technique information correctly', async () => {
            const result = await parseAgent.parse(sampleStixBundle);
            const technique = result.techniqueIndex.get('T1566');

            expect(technique).to.exist;
            expect(technique?.name).to.equal('Phishing');
            expect(technique?.platforms).to.include('Windows');
            expect(technique?.dataSources).to.include('Email Gateway');
        });

        it('should handle subtechniques correctly', async () => {
            const result = await parseAgent.parse(sampleStixBundle);
            const parent = result.techniqueIndex.get('T1566');
            const child = result.techniqueIndex.get('T1566.001');

            expect(parent?.subtechniques).to.be.an('array');
            expect(child?.parent).to.equal('T1566');
        });

        it('should map techniques to tactics', async () => {
            const result = await parseAgent.parse(sampleStixBundle);
            const initialAccessTactics = result.tacticMap.get('initial-access');

            expect(initialAccessTactics).to.exist;
            expect(initialAccessTactics).to.include('T1566');
        });

        it('should attach mitigations to techniques', async () => {
            const result = await parseAgent.parse(sampleStixBundle);
            const technique = result.techniqueIndex.get('T1566');

            expect(technique?.mitigations).to.be.an('array');
            expect(technique?.mitigations[0].name).to.equal('User Training');
        });
    });

    describe('#findTechniqueById', () => {
        it('should return a technique by ID', async () => {
            await parseAgent.parse(sampleStixBundle);
            const technique = parseAgent.findTechniqueById('T1566');

            expect(technique).to.exist;
            expect(technique?.name).to.equal('Phishing');
        });

        it('should return null for a non-existent technique ID', async () => {
            await parseAgent.parse(sampleStixBundle);
            const technique = parseAgent.findTechniqueById('T9999');

            expect(technique).to.be.null;
        });
    });

    describe('#searchTechniques', () => {
        it('should find techniques by search query', async () => {
            await parseAgent.parse(sampleStixBundle);
            const results = parseAgent.searchTechniques('phish');

            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            expect(results[0].name).to.equal('Phishing');
        });

        it('should return all techniques for an empty query', async () => {
            await parseAgent.parse(sampleStixBundle);
            const results = parseAgent.searchTechniques('');

            expect(results).to.be.an('array');
            expect(results.length).to.equal(2); // Our sample has 2 techniques
        });
    });

    describe('#filterTechniques', () => {
        it('should filter techniques by platform', async () => {
            await parseAgent.parse(sampleStixBundle);
            const results = parseAgent.filterTechniques({
                platforms: ['Windows']
            });

            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            expect(results[0].platforms).to.include('Windows');
        });

        it('should filter techniques by data source', async () => {
            await parseAgent.parse(sampleStixBundle);
            const results = parseAgent.filterTechniques({
                dataSources: ['Email Gateway']
            });

            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            expect(results[0].dataSources).to.include('Email Gateway');
        });

        it('should combine multiple filters', async () => {
            await parseAgent.parse(sampleStixBundle);
            const results = parseAgent.filterTechniques({
                platforms: ['Windows'],
                dataSources: ['Email Gateway'],
                text: 'phish'
            });

            expect(results).to.be.an('array');
            expect(results.length).to.be.greaterThan(0);
            expect(results[0].name).to.equal('Phishing');
        });
    });
});
