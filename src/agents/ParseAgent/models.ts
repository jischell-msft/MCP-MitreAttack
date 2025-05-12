/**
 * ParseAgent models and interfaces
 */

export interface ParseAgentConfig {
    includeSubtechniques: boolean;
    includeTactics: boolean;
    includeDataSources: boolean;
    extractKeywords: boolean;
}

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
}

export interface MitigationRef {
    id: string;                   // Mitigation ID
    name: string;                 // Mitigation name
    description?: string;         // Brief description
}

export interface ParseAgentOutput {
    techniques: TechniqueModel[];              // List of all techniques
    techniqueIndex: Map<string, TechniqueModel>; // Index by ID
    tacticMap: Map<string, string[]>;           // Map tactics to technique IDs
    version: string;                            // ATT&CK version
}

export interface TechniqueFilters {
    tactics?: string[];
    platforms?: string[];
    dataSources?: string[];
    text?: string;
}
