import { TechniqueModel, MitigationRef } from './types';
import { logger } from '../../utils/logger';

/**
 * Interface for STIX objects in the ATT&CK bundle
 */
interface StixObject {
    id: string;
    type: string;
    name?: string;
    description?: string;
    external_references?: Array<{
        source_name: string;
        external_id?: string;
        url?: string;
    }>;
    object_marking_refs?: string[];
    created_by_ref?: string;
    created?: string;
    modified?: string;
    x_mitre_platforms?: string[];
    x_mitre_data_sources?: string[];
    x_mitre_detection?: string;
    x_mitre_tactic_type?: string;
    x_mitre_defense_bypassed?: string[];
    kill_chain_phases?: Array<{
        kill_chain_name: string;
        phase_name: string;
    }>;
    [key: string]: any;
}

/**
 * Interface for STIX relationship objects
 */
interface StixRelationship {
    id: string;
    type: string;
    relationship_type: string;
    source_ref: string;
    target_ref: string;
    description?: string;
    created?: string;
    modified?: string;
}

/**
 * Interface for STIX bundle
 */
interface StixBundle {
    type: string;
    id: string;
    spec_version: string;
    objects: (StixObject | StixRelationship)[];
}

/**
 * Class for parsing STIX 2.0/2.1 objects from MITRE ATT&CK
 */
export class StixParser {
    /**
     * Extract version information from MITRE ATT&CK data
     */
    static extractVersion(data: any): string {
        try {
            // First check for x-mitre-collection with version
            if (data?.objects) {
                const collection = data.objects.find(
                    (obj: any) => obj.type === 'x-mitre-collection'
                );

                if (collection && collection.x_mitre_version) {
                    return collection.x_mitre_version;
                }
            }

            // Then check for STIX spec_version
            if (data?.spec_version) {
                return `STIX-${data.spec_version}`;
            }

            // Default version if not found
            return 'unknown';
        } catch (error) {
            logger.warn('Failed to extract MITRE version');
            return 'unknown';
        }
    }

    /**
     * Validate that the provided data is a valid STIX bundle
     */
    static validateBundle(data: any): data is StixBundle {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (data.type !== 'bundle' || !Array.isArray(data.objects)) {
            return false;
        }

        return true;
    }

    /**
     * Extract attack-pattern objects from STIX bundle
     */
    static extractAttackPatterns(bundle: StixBundle): StixObject[] {
        if (!this.validateBundle(bundle)) {
            throw new Error('Invalid STIX bundle format');
        }

        return bundle.objects.filter(
            obj => obj.type === 'attack-pattern'
        ) as StixObject[];
    }

    /**
     * Extract relationships from STIX bundle
     */
    static extractRelationships(bundle: StixBundle): StixRelationship[] {
        if (!this.validateBundle(bundle)) {
            throw new Error('Invalid STIX bundle format');
        }

        return bundle.objects.filter(
            obj => obj.type === 'relationship'
        ) as StixRelationship[];
    }

    /**
     * Extract tactics (x-mitre-tactic) from STIX bundle
     */
    static extractTactics(bundle: StixBundle): Map<string, string> {
        if (!this.validateBundle(bundle)) {
            throw new Error('Invalid STIX bundle format');
        }

        const tacticsMap = new Map<string, string>();

        const tactics = bundle.objects.filter(
            obj => obj.type === 'x-mitre-tactic'
        ) as StixObject[];

        tactics.forEach(tactic => {
            const shortName = tactic.x_mitre_shortname;
            if (shortName) {
                tacticsMap.set(tactic.id, shortName);
            }
        });

        return tacticsMap;
    }

    /**
     * Extract mitigations (course-of-action) from STIX bundle
     */
    static extractMitigations(bundle: StixBundle): Map<string, MitigationRef> {
        if (!this.validateBundle(bundle)) {
            throw new Error('Invalid STIX bundle format');
        }

        const mitigationsMap = new Map<string, MitigationRef>();

        const mitigations = bundle.objects.filter(
            obj => obj.type === 'course-of-action'
        ) as StixObject[];

        mitigations.forEach(mitigation => {
            // Get MITRE ID from external references
            const mitreRef = mitigation.external_references?.find(
                ref => ref.source_name === 'mitre-attack'
            );

            const id = mitreRef?.external_id || mitigation.id;

            mitigationsMap.set(mitigation.id, {
                id,
                name: mitigation.name || id,
                description: mitigation.description
            });
        });

        return mitigationsMap;
    }

    /**
     * Create a map of subtechnique relationships
     */
    static buildSubtechniqueMap(relationships: StixRelationship[]): Map<string, string[]> {
        const subtechniqueMap = new Map<string, string[]>();

        // Find all subtechnique relationships
        const subtechniqueRels = relationships.filter(
            rel => rel.relationship_type === 'subtechnique-of'
        );

        // Group subtechniques by parent
        subtechniqueRels.forEach(rel => {
            const parentId = rel.target_ref;
            const subId = rel.source_ref;

            if (!subtechniqueMap.has(parentId)) {
                subtechniqueMap.set(parentId, []);
            }

            subtechniqueMap.get(parentId)!.push(subId);
        });

        return subtechniqueMap;
    }

    /**
     * Create a map of mitigation relationships
     */
    static buildMitigationMap(relationships: StixRelationship[]): Map<string, string[]> {
        const mitigationMap = new Map<string, string[]>();

        // Find all mitigation relationships
        const mitigationRels = relationships.filter(
            rel => rel.relationship_type === 'mitigates'
        );

        // Group mitigations by technique
        mitigationRels.forEach(rel => {
            const techniqueId = rel.target_ref;
            const mitigationId = rel.source_ref;

            if (!mitigationMap.has(techniqueId)) {
                mitigationMap.set(techniqueId, []);
            }

            mitigationMap.get(techniqueId)!.push(mitigationId);
        });

        return mitigationMap;
    }

    /**
     * Create a map of kill chain phases (tactics) for each technique
     */
    static buildTacticMap(attackPatterns: StixObject[]): Map<string, string[]> {
        const tacticsMap = new Map<string, string[]>();

        attackPatterns.forEach(technique => {
            if (technique.kill_chain_phases) {
                const tactics = technique.kill_chain_phases
                    .filter(kcp => kcp.kill_chain_name === 'mitre-attack')
                    .map(kcp => kcp.phase_name);

                if (tactics.length > 0) {
                    tacticsMap.set(technique.id, tactics);
                }
            }
        });

        return tacticsMap;
    }

    /**
     * Extract technique URL from external references
     */
    static extractTechniqueUrl(technique: StixObject): string {
        const mitreRef = technique.external_references?.find(
            ref => ref.source_name === 'mitre-attack' && ref.url
        );

        return mitreRef?.url || '';
    }

    /**
     * Extract technique ID (e.g., T1566) from external references
     */
    static extractTechniqueId(technique: StixObject): string {
        const mitreRef = technique.external_references?.find(
            ref => ref.source_name === 'mitre-attack' && ref.external_id
        );

        return mitreRef?.external_id || technique.id;
    }
}
