import { extractVersionFromMitreData, compareVersions } from '../../../src/agents/fetch/version-utils';

describe('Version Utilities', () => {
    describe('extractVersionFromMitreData', () => {
        it('should extract version from x-mitre-collection object', () => {
            const mitreData = {
                objects: [
                    { type: 'x-mitre-collection', x_mitre_version: '13.1' }
                ]
            };

            expect(extractVersionFromMitreData(mitreData)).toBe('13.1');
        });

        it('should extract version from STIX spec_version', () => {
            const mitreData = {
                spec_version: '2.0',
                objects: []
            };

            expect(extractVersionFromMitreData(mitreData)).toBe('STIX-2.0');
        });

        it('should extract version from marking-definition statement', () => {
            const mitreData = {
                objects: [
                    {
                        type: 'marking-definition',
                        definition_type: 'statement',
                        definition: {
                            statement: 'This is MITRE ATT&CK version 13.2'
                        }
                    }
                ]
            };

            expect(extractVersionFromMitreData(mitreData)).toBe('13.2');
        });

        it('should generate timestamp-based version if no version found', () => {
            const mitreData = {
                objects: [
                    { type: 'not-a-collection' }
                ]
            };

            // Since this uses current timestamp, we can't test exact value
            // but we can test the format (YYYYMMDDHHMM)
            const version = extractVersionFromMitreData(mitreData);
            expect(version).toMatch(/^\d{12}$/);
        });
    });

    describe('compareVersions', () => {
        it('should compare semantic versions correctly', () => {
            expect(compareVersions('13.1', '13.2')).toBe(-1);
            expect(compareVersions('13.2', '13.1')).toBe(1);
            expect(compareVersions('13.1', '13.1')).toBe(0);
            expect(compareVersions('13.1.5', '13.1.2')).toBe(1);
            expect(compareVersions('14.0.0', '13.9.9')).toBe(1);
        });

        it('should compare STIX versions correctly', () => {
            expect(compareVersions('STIX-2.0', 'STIX-2.1')).toBe(-1);
            expect(compareVersions('STIX-2.1', 'STIX-2.0')).toBe(1);
            expect(compareVersions('STIX-2.0', 'STIX-2.0')).toBe(0);
        });

        it('should compare date-based versions correctly', () => {
            expect(compareVersions('202301010000', '202301020000')).toBe(-1);
            expect(compareVersions('202301020000', '202301010000')).toBe(1);
        });

        it('should default to string comparison for different formats', () => {
            expect(compareVersions('13.1', 'abc')).toBe(-1); // '13.1' < 'abc' in string comparison
            expect(compareVersions('xyz', '13.1')).toBe(1); // 'xyz' > '13.1' in string comparison
        });
    });
});
