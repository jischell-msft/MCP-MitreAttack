import {
    ParseAgentConfig,
    TechniqueModel,
    ParseAgentOutput,
    TechniqueFilters,
    MitigationRef
} from './models';
import { KeywordExtractor } from './KeywordExtractor';
import { Logger } from '../../utils/Logger';

/**
 * ParseAgent is responsible for transforming raw MITRE ATT&CK STIX data
 * into an optimized, searchable structure focused on techniques and tactics.
 */
export class ParseAgent {
    private config: ParseAgentConfig;
    private techniqueIndex: Map<string, TechniqueModel>;
    private tacticMap: Map<string, string[]>;
    private keywordExtractor: KeywordExtractor;
    private logger: Logger;
    private version: string = '';

    constructor(config: ParseAgentConfig, logger?: Logger) {
        this.config = {
            includeSubtechniques: true,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true,
            ...config
        };
        this.techniqueIndex = new Map();
        this.tacticMap = new Map();
        this.keywordExtractor = new KeywordExtractor();
        this.logger = logger || new Logger('ParseAgent');
    }

    /**
     * Initialize the ParseAgent
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing ParseAgent');
        await this.keywordExtractor.initialize();
        this.logger.info('ParseAgent initialization complete');
    }

    /**
     * Parse MITRE ATT&CK data from STIX bundle
     * @param mitreData - Raw STIX bundle from MITRE ATT&CK
     */
    async parse(mitreData: any): Promise<ParseAgentOutput> {
        this.logger.info('Beginning parse operation on MITRE data');

        try {
            // Clear existing data
            this.techniqueIndex.clear();
            this.tacticMap.clear();

            // Extract version information
            this.version = this.extractVersion(mitreData);
            this.logger.info(`Parsing MITRE ATT&CK version: ${this.version}`);

            // Step 1: Extract all objects by type
            const objectsByType = this.categorizeStixObjects(mitreData);

            // Step 2: Extract tactics first
            const tactics = this.extractTactics(objectsByType.get('x-mitre-tactic') || []);

            // Step 3: Extract techniques and subtechniques
            const techniques = this.extractTechniques(
                objectsByType.get('attack-pattern') || [],
                objectsByType.get('relationship') || []
            );

            // Step 4: Add mitigations
            if (objectsByType.has('course-of-action')) {
                this.attachMitigations(
                    techniques,
                    objectsByType.get('course-of-action') || [],
                    objectsByType.get('relationship') || []
                );
            }

            // Step 5: Build the technique index
            this.buildTechniqueIndex(techniques);

            // Step 6: Build the tactic map if enabled
            if (this.config.includeTactics) {
                this.buildTacticMap(techniques);
            }

            // Step 7: Organize subtechniques
            if (this.config.includeSubtechniques) {
                this.organizeSubtechniques(techniques);
            }

            this.logger.info(`Parse complete: ${this.techniqueIndex.size} techniques indexed, ${this.tacticMap.size} tactics mapped`);

            return {
                techniques: Array.from(this.techniqueIndex.values()),
                techniqueIndex: this.techniqueIndex,
                tacticMap: this.tacticMap,
                version: this.version
            };
        } catch (error) {
            this.logger.error('Error parsing MITRE data', error);
            throw new Error(`Failed to parse MITRE data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Find a technique by its ID
     * @param id - Technique ID (e.g., "T1566")
     */
    findTechniqueById(id: string): TechniqueModel | null {
        return this.techniqueIndex.get(id) || null;
    }

    /**
     * Search techniques by text query
     * @param query - Text to search for
     */
    searchTechniques(query: string): TechniqueModel[] {
        if (!query || query.trim() === '') {
            return Array.from(this.techniqueIndex.values());
        }

        const queryLower = query.toLowerCase();
        const results: TechniqueModel[] = [];

        for (const technique of this.techniqueIndex.values()) {
            // Check ID
            if (technique.id.toLowerCase().includes(queryLower)) {
                results.push(technique);
                continue;
            }

            // Check name
            if (technique.name.toLowerCase().includes(queryLower)) {
                results.push(technique);
                continue;
            }

            // Check description
            if (technique.description.toLowerCase().includes(queryLower)) {
                results.push(technique);
                continue;
            }

            // Check keywords
            if (technique.keywords.some(k => k.toLowerCase().includes(queryLower))) {
                results.push(technique);
                continue;
            }
        }

        return results;
    }

    /**
     * Filter techniques based on criteria
     * @param filters - Filter criteria
     */
    filterTechniques(filters: TechniqueFilters): TechniqueModel[] {
        let results = Array.from(this.techniqueIndex.values());

        // Filter by tactics
        if (filters.tactics && filters.tactics.length > 0) {
            results = results.filter(technique =>
                technique.tactics.some(tactic =>
                    filters.tactics!.includes(tactic)
                )
            );
        }

        // Filter by platforms
        if (filters.platforms && filters.platforms.length > 0) {
            results = results.filter(technique =>
                technique.platforms.some(platform =>
                    filters.platforms!.includes(platform)
                )
            );
        }

        // Filter by data sources
        if (filters.dataSources && filters.dataSources.length > 0) {
            results = results.filter(technique =>
                technique.dataSources.some(dataSource =>
                    filters.dataSources!.includes(dataSource)
                )
            );
        }

        // Filter by text search
        if (filters.text && filters.text.trim() !== '') {
            results = this.searchTechniques(filters.text).filter(t =>
                results.some(r => r.id === t.id)
            );
        }

        return results;
    }

    /**
     * Extract version information from STIX bundle
     */
    private extractVersion(mitreData: any): string {
        try {
            // Check for version in bundle metadata
            if (mitreData.spec_version) {
                return mitreData.spec_version;
            }

            // Check for x-mitre-version in bundle
            if (mitreData['x-mitre-version']) {
                return mitreData['x-mitre-version'];
            }

            // Look for objects with version information
            if (mitreData.objects && Array.isArray(mitreData.objects)) {
                for (const obj of mitreData.objects) {
                    if (obj['x-mitre-version']) {
                        return obj['x-mitre-version'];
                    }
                }
            }

            return 'unknown';
        } catch (error) {
            this.logger.warn('Could not extract version information', error);
            return 'unknown';
        }
    }

    /**
     * Categorize STIX objects by type
     */
    private categorizeStixObjects(mitreData: any): Map<string, any[]> {
        const objectsByType = new Map<string, any[]>();

        if (!mitreData.objects || !Array.isArray(mitreData.objects)) {
            this.logger.warn('No objects found in STIX bundle');
            return objectsByType;
        }

        for (const obj of mitreData.objects) {
            if (!obj.type) continue;

            if (!objectsByType.has(obj.type)) {
                objectsByType.set(obj.type, []);
            }

            objectsByType.get(obj.type)!.push(obj);
        }

        this.logger.info(`Categorized ${mitreData.objects.length} STIX objects into ${objectsByType.size} types`);
        return objectsByType;
    }

    /**
     * Extract tactics from STIX objects
     */
    private extractTactics(tacticObjects: any[]): Map<string, string> {
        const tactics = new Map<string, string>();

        for (const tactic of tacticObjects) {
            if (!tactic.id || !tactic.name) continue;

            // Extract the short name from x-mitre-shortname
            const shortName = tactic['x-mitre-shortname'] || tactic.name.toLowerCase().replace(/\s+/g, '-');
            tactics.set(tactic.id, shortName);
        }

        this.logger.info(`Extracted ${tactics.size} tactics`);
        return tactics;
    }

    /**
     * Extract techniques from STIX objects
     */
    private extractTechniques(techniqueObjects: any[], relationshipObjects: any[]): TechniqueModel[] {
        const techniques: TechniqueModel[] = [];

        // Build a relationship map for faster lookup
        const relationshipMap = new Map<string, any[]>();
        for (const rel of relationshipObjects) {
            if (!rel.source_ref || !rel.target_ref || !rel.relationship_type) continue;

            if (!relationshipMap.has(rel.source_ref)) {
                relationshipMap.set(rel.source_ref, []);
            }

            relationshipMap.get(rel.source_ref)!.push(rel);
        }

        // Process each technique
        for (const technique of techniqueObjects) {
            if (!technique.id || !technique.name) continue;

            // Get external references to find MITRE URL
            const externalRefs = technique.external_references || [];
            const mitreRef = externalRefs.find((ref: any) =>
                ref.source_name === 'mitre-attack' || ref.url?.includes('attack.mitre.org')
            );

            // Extract technique ID from external_id if present
            const techniqueId = mitreRef?.external_id || technique.id.split('--').pop();

            // Find tactic relationships
            const tacticRelationships = this.findRelationships(technique.id, relationshipMap, 'kill-chain-phase');
            const tactics = tacticRelationships.map((rel: any) => {
                if (rel.target_ref && typeof rel.target_ref === 'string') {
                    return rel.target_ref.split('--').pop();
                }
                return '';
            }).filter(Boolean);

            // Create technique model
            const techModel: TechniqueModel = {
                id: techniqueId,
                name: technique.name,
                description: technique.description || '',
                tactics: tactics,
                platforms: technique.x_mitre_platforms || [],
                dataSources: this.config.includeDataSources ? (technique.x_mitre_data_sources || []) : [],
                detection: technique.x_mitre_detection || '',
                mitigations: [], // Will be populated later
                url: mitreRef?.url || `https://attack.mitre.org/techniques/${techniqueId}/`,
                keywords: this.config.extractKeywords ?
                    this.keywordExtractor.extractKeywords(technique.name + ' ' + (technique.description || '')) :
                    []
            };

            // Check if this is a sub-technique
            if (techniqueId.includes('.')) {
                const parentId = techniqueId.split('.')[0];
                techModel.parent = parentId;
            }

            techniques.push(techModel);
        }

        this.logger.info(`Extracted ${techniques.length} techniques`);
        return techniques;
    }

    /**
     * Find relationships for a given source object
     */
    private findRelationships(sourceId: string, relationshipMap: Map<string, any[]>, type?: string): any[] {
        if (!relationshipMap.has(sourceId)) {
            return [];
        }

        const relationships = relationshipMap.get(sourceId)!;

        if (!type) {
            return relationships;
        }

        return relationships.filter(rel => rel.relationship_type === type);
    }

    /**
     * Attach mitigations to techniques
     */
    private attachMitigations(techniques: TechniqueModel[], mitigationObjects: any[], relationshipObjects: any[]): void {
        // Create mitigation index
        const mitigationIndex = new Map<string, any>();
        for (const mitigation of mitigationObjects) {
            if (!mitigation.id || !mitigation.name) continue;
            mitigationIndex.set(mitigation.id, mitigation);
        }

        // Build a relationship map focusing on 'mitigates' relationships
        const mitigationRelationships = relationshipObjects.filter(rel =>
            rel.relationship_type === 'mitigates'
        );

        // Attach mitigations to techniques
        for (const technique of techniques) {
            const techId = technique.id;

            // Find all mitigations that target this technique
            const mitigationsForTech = mitigationRelationships.filter(rel => {
                // Get the technique ID from the target_ref
                const targetTechId = rel.target_ref?.split('--').pop();
                // Check if it matches this technique's ID
                return targetTechId === techId;
            });

            // Convert to mitigation references
            technique.mitigations = mitigationsForTech
                .map(rel => {
                    const mitigationObj = mitigationIndex.get(rel.source_ref);
                    if (!mitigationObj) return null;

                    return {
                        id: mitigationObj.id.split('--').pop(),
                        name: mitigationObj.name,
                        description: mitigationObj.description
                    } as MitigationRef;
                })
                .filter(Boolean) as MitigationRef[];
        }

        this.logger.info(`Attached mitigations to techniques`);
    }

    /**
     * Build the technique index for fast lookup
     */
    private buildTechniqueIndex(techniques: TechniqueModel[]): void {
        for (const technique of techniques) {
            this.techniqueIndex.set(technique.id, technique);
        }
    }

    /**
     * Build the tactic map for filtering by tactic
     */
    private buildTacticMap(techniques: TechniqueModel[]): void {
        for (const technique of techniques) {
            for (const tactic of technique.tactics) {
                if (!this.tacticMap.has(tactic)) {
                    this.tacticMap.set(tactic, []);
                }

                this.tacticMap.get(tactic)!.push(technique.id);
            }
        }
    }

    /**
     * Organize subtechniques under their parent techniques
     */
    private organizeSubtechniques(techniques: TechniqueModel[]): void {
        // First pass: identify parent and child techniques
        const parentTechniques = new Map<string, TechniqueModel>();
        const childTechniques = new Map<string, TechniqueModel[]>();

        for (const technique of techniques) {
            if (technique.parent) {
                // This is a sub-technique
                if (!childTechniques.has(technique.parent)) {
                    childTechniques.set(technique.parent, []);
                }
                childTechniques.get(technique.parent)!.push(technique);
            } else {
                // This is a parent technique
                parentTechniques.set(technique.id, technique);
            }
        }

        // Second pass: attach subtechniques to parents
        for (const [parentId, children] of childTechniques.entries()) {
            const parentTechnique = parentTechniques.get(parentId);
            if (parentTechnique) {
                parentTechnique.subtechniques = children;
            }
        }
    }
}
