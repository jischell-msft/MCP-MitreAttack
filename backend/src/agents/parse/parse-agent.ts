import { Agent } from '../index';
import {
    IParseAgent,
    ParseAgentConfig,
    ParseAgentOutput,
    TechniqueModel,
    TechniqueFilters,
    MitigationRef
} from './types';
import { StixParser } from './stix-parser';
import { KeywordExtractor } from './keyword-extractor';
import { logger } from '../../utils/logger';

/**
 * Agent responsible for parsing MITRE ATT&CK STIX data
 */
export class ParseAgent implements Agent, IParseAgent {
    private config: ParseAgentConfig;
    private isInitialized = false;
    private techniqueIndex: Map<string, TechniqueModel> = new Map();
    private tacticMap: Map<string, string[]> = new Map();
    private currentVersion = 'unknown';

    /**
     * Create a new ParseAgent
     * @param config Configuration options
     */
    constructor(config: Partial<ParseAgentConfig> = {}) {
        this.config = {
            includeSubtechniques: true,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true,
            ...config
        };
    }

    /**
     * Initialize the agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        logger.info('Initializing ParseAgent');

        // Reset state
        this.techniqueIndex = new Map();
        this.tacticMap = new Map();

        this.isInitialized = true;
        logger.info('ParseAgent initialized successfully');
    }

    /**
     * Get the agent name
     */
    getName(): string {
        return 'ParseAgent';
    }

    /**
     * Get the agent version
     */
    getVersion(): string {
        return '1.0.0';
    }

    /**
     * Parse MITRE ATT&CK data
     * @param mitreData Raw MITRE ATT&CK data from FetchAgent
     * @returns Parsed techniques and indexes
     */
    async parse(mitreData: object): Promise<ParseAgentOutput> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        logger.info('Starting to parse MITRE ATT&CK data');

        try {
            // Extract version information
            this.currentVersion = StixParser.extractVersion(mitreData);
            logger.info(`Parsing MITRE ATT&CK version: ${this.currentVersion}`);

            // Validate bundle
            if (!StixParser.validateBundle(mitreData)) {
                throw new Error('Invalid STIX bundle format');
            }

            // Reset state
            this.techniqueIndex = new Map();
            this.tacticMap = new Map();

            // Extract components from the bundle
            const attackPatterns = StixParser.extractAttackPatterns(mitreData);
            const relationships = StixParser.extractRelationships(mitreData);
            const tacticsMap = StixParser.extractTactics(mitreData);
            const mitigationsMap = StixParser.extractMitigations(mitreData);

            // Build relationship maps
            const subtechniqueMap = StixParser.buildSubtechniqueMap(relationships);
            const mitigationRelMap = StixParser.buildMitigationMap(relationships);
            const techniqueToTacticsMap = StixParser.buildTacticMap(attackPatterns);

            // First pass: create technique models without subtechniques
            attackPatterns.forEach(technique => {
                const id = StixParser.extractTechniqueId(technique);

                // Skip if this is a subtechnique and includeSubtechniques is false
                if (!this.config.includeSubtechniques && id.includes('.')) {
                    return;
                }

                const techniqueModel = this.createTechniqueModel(
                    technique,
                    techniqueToTacticsMap.get(technique.id) || [],
                    mitigationRelMap.get(technique.id) || [],
                    mitigationsMap
                );

                // Add to technique index
                this.techniqueIndex.set(technique.id, techniqueModel);

                // Also index by external ID (e.g., T1566)
                if (id !== technique.id) {
                    this.techniqueIndex.set(id, techniqueModel);
                }
            });

            // Second pass: build parent-child relationships
            if (this.config.includeSubtechniques) {
                subtechniqueMap.forEach((subtechniqueIds, parentId) => {
                    const parent = this.techniqueIndex.get(parentId);
                    if (parent) {
                        parent.subtechniques = subtechniqueIds
                            .map(id => this.techniqueIndex.get(id))
                            .filter((sub): sub is TechniqueModel => !!sub);

                        // Add parent reference to each subtechnique
                        parent.subtechniques.forEach(sub => {
                            sub.parent = parentId;
                        });
                    }
                });
            }

            // Build tactic map (tactic -> technique IDs)
            this.buildTacticMap();

            // Count techniques
            const totalTechniques = this.techniqueIndex.size;
            const mainTechniques = Array.from(this.techniqueIndex.values())
                .filter(t => !t.parent).length;
            const subTechniques = totalTechniques - mainTechniques;

            logger.info(`Successfully parsed ${totalTechniques} techniques (${mainTechniques} main, ${subTechniques} sub)`);

            // Return parsed data
            return {
                techniques: Array.from(this.techniqueIndex.values()),
                techniqueIndex: this.techniqueIndex,
                tacticMap: this.tacticMap,
                version: this.currentVersion
            };
        } catch (error: any) {
            logger.error(`Failed to parse MITRE data: ${error.message}`);
            throw new Error(`Failed to parse MITRE ATT&CK data: ${error.message}`);
        }
    }

    /**
     * Find a technique by ID
     * @param id Technique ID (e.g., T1566 or T1566.001)
     * @returns Technique model or null if not found
     */
    findTechniqueById(id: string): TechniqueModel | null {
        return this.techniqueIndex.get(id) || null;
    }

    /**
     * Search techniques by text query
     * @param query Search text
     * @returns Array of matching techniques
     */
    searchTechniques(query: string): TechniqueModel[] {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const searchTerms = query.toLowerCase().split(/\s+/);
        const results: Array<{ technique: TechniqueModel; score: number }> = [];

        // Search through all techniques
        this.techniqueIndex.forEach(technique => {
            let score = 0;
            const lowerName = technique.name.toLowerCase();
            const lowerDesc = technique.description.toLowerCase();

            // Check each search term
            for (const term of searchTerms) {
                // Exact match in name (highest weight)
                if (lowerName === term) {
                    score += 100;
                }
                // Name contains term (high weight)
                else if (lowerName.includes(term)) {
                    score += 75;
                }

                // ID contains term (high weight)
                if (technique.id.toLowerCase().includes(term)) {
                    score += 75;
                }

                // Description contains term (medium weight)
                if (lowerDesc.includes(term)) {
                    score += 50;
                }

                // Keyword match (medium weight)
                if (technique.keywords.some(k => k.includes(term))) {
                    score += 25;
                }

                // Tactic match (low weight)
                if (technique.tactics.some(t => t.toLowerCase().includes(term))) {
                    score += 15;
                }
            }

            // Add to results if there was any match
            if (score > 0) {
                results.push({ technique, score });
            }
        });

        // Sort by score (highest first) and return just the techniques
        return results
            .sort((a, b) => b.score - a.score)
            .map(result => result.technique);
    }

    /**
     * Filter techniques by various criteria
     * @param filters Filter criteria
     * @returns Array of matching techniques
     */
    filterTechniques(filters: TechniqueFilters): TechniqueModel[] {
        let results = Array.from(this.techniqueIndex.values());

        // Filter by tactics
        if (filters.tactics && filters.tactics.length > 0) {
            const tactics = filters.tactics.map(t => t.toLowerCase());
            results = results.filter(technique =>
                technique.tactics.some(tactic =>
                    tactics.includes(tactic.toLowerCase())
                )
            );
        }

        // Filter by platforms
        if (filters.platforms && filters.platforms.length > 0) {
            const platforms = filters.platforms.map(p => p.toLowerCase());
            results = results.filter(technique =>
                technique.platforms.some(platform =>
                    platforms.includes(platform.toLowerCase())
                )
            );
        }

        // Filter by data sources
        if (filters.dataSources && filters.dataSources.length > 0) {
            const dataSources = filters.dataSources.map(ds => ds.toLowerCase());
            results = results.filter(technique =>
                technique.dataSources.some(ds =>
                    dataSources.includes(ds.toLowerCase())
                )
            );
        }

        // Filter by text
        if (filters.text && filters.text.trim().length > 0) {
            const searchResults = this.searchTechniques(filters.text);
            const searchResultIds = new Set(searchResults.map(t => t.id));
            results = results.filter(technique => searchResultIds.has(technique.id));
        }

        return results;
    }

    /**
     * Create a technique model from STIX object
     */
    private createTechniqueModel(
        technique: any,
        tactics: string[],
        mitigationIds: string[],
        mitigationsMap: Map<string, MitigationRef>
    ): TechniqueModel {
        const id = StixParser.extractTechniqueId(technique);
        const url = StixParser.extractTechniqueUrl(technique);

        // Extract platforms
        const platforms = technique.x_mitre_platforms || [];

        // Extract data sources
        const dataSources = this.config.includeDataSources
            ? (technique.x_mitre_data_sources || [])
            : [];

        // Extract detection text
        const detection = technique.x_mitre_detection || '';

        // Get related mitigations
        const mitigations: MitigationRef[] = mitigationIds
            .map(id => mitigationsMap.get(id))
            .filter((m): m is MitigationRef => !!m);

        // Extract keywords if configured
        const keywords = this.config.extractKeywords
            ? KeywordExtractor.extractKeywords(
                technique.description || '',
                technique.name || '',
                true
            )
            : [];

        // Create technique model
        return {
            id,
            name: technique.name || id,
            description: technique.description || '',
            tactics,
            platforms,
            dataSources,
            detection,
            mitigations,
            url,
            keywords,
            created: technique.created || '',
            modified: technique.modified || ''
        };
    }

    /**
     * Build a map of tactics to technique IDs
     */
    private buildTacticMap(): void {
        if (!this.config.includeTactics) {
            return;
        }

        this.tacticMap = new Map<string, string[]>();

        // Group techniques by tactic
        this.techniqueIndex.forEach(technique => {
            technique.tactics.forEach(tactic => {
                if (!this.tacticMap.has(tactic)) {
                    this.tacticMap.set(tactic, []);
                }

                this.tacticMap.get(tactic)!.push(technique.id);
            });
        });
    }
}
