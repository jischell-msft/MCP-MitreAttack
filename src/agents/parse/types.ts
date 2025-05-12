/**
 * ParseAgent interfaces and types
 */

/**
 * Configuration for ParseAgent
 */
export interface ParseAgentConfig {
    includeSubtechniques: boolean;
    includeTactics: boolean;
    includeDataSources: boolean;
    extractKeywords: boolean;
}

/**
 * Model representing a MITRE ATT&CK technique
 */
export interface TechniqueModel {
    id: string;                   // Technique ID (e.g., "T1566")
    name: string;                 // Technique name
    description: string;          // Full description
    tactics: string[];            // Associated tactics
    platforms: string[];          // Affected platforms
    dataSources: string[];        // Relevant data sources
    detection: string;            // Detection guidance
    mitigations: MitigationRef[]; // Related mitigations
    url: string;                  // Link to MITRE documentation
    keywords: string[];           // Extracted keywords for matching
    subtechniques?: TechniqueModel[]; // Child techniques
    parent?: string;              // Parent technique ID
    created: string;              // Creation date
    modified: string;             // Last modified date
}

/**
 * Reference to a mitigation
 */
export interface MitigationRef {
    id: string;                   // Mitigation ID
    name: string;                 // Mitigation name
    description?: string;         // Brief description
}

/**
 * Output from ParseAgent
 */
export interface ParseAgentOutput {
    techniques: TechniqueModel[];              // List of all techniques
    techniqueIndex: Map<string, TechniqueModel>; // Index by ID
    tacticMap: Map<string, string[]>;           // Map tactics to technique IDs
    version: string;                            // ATT&CK version
}

/**
 * Filters for technique searches
 */
export interface TechniqueFilters {
    tactics?: string[];
    platforms?: string[];
    dataSources?: string[];
    text?: string;
}

/**
 * ParseAgent interface
 */
export interface IParseAgent {
    initialize(): Promise<void>;
    parse(mitreData: object): Promise<ParseAgentOutput>;
    findTechniqueById(id: string): TechniqueModel | null;
    searchTechniques(query: string): TechniqueModel[];
    filterTechniques(filters: TechniqueFilters): TechniqueModel[];
}
