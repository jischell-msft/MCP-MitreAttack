# ParseAgent Development

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. The ParseAgent is responsible for transforming the raw MITRE ATT&CK STIX data (fetched by the FetchAgent) into an optimized, searchable structure focused on techniques, tactics, and procedures.

## Requirements
- Parse the complete STIX bundle from MITRE ATT&CK
- Extract relevant technique information and relationships
- Create an optimized internal model for techniques
- Build an indexed structure for efficient searching

## Tasks

### 2.2.1. Create ParseAgent interface and model
- Define the ParseAgent interface
- Create data models for parsed techniques
- Define input/output specifications
- Implement configuration options

### 2.2.2. Implement STIX parser for ATT&CK data
- Create parser for STIX 2.0/2.1 objects
- Extract attack-patterns (techniques)
- Parse relationships between objects
- Handle STIX bundle structure

### 2.2.3. Create technique model structure
- Define comprehensive technique model
- Include all relevant fields from MITRE
- Add fields for internal use (keywords, etc.)
- Create proper TypeScript interfaces

### 2.2.4. Implement technique extraction logic
- Extract technique details from STIX objects
- Parse descriptions and detection information
- Extract tactic categories
- Map data sources and platforms

### 2.2.5. Create technique indexing for search
- Implement indexing by technique ID
- Create keyword extraction for techniques
- Build text search capabilities
- Optimize for search performance

### 2.2.6. Add relationship mapping between techniques
- Parse and extract relationships
- Create parent-child relationships
- Map techniques to tactics
- Link techniques to mitigations

### 2.2.7. Implement filtering capabilities
- Add filtering by tactic
- Implement filtering by platform
- Create filtering by data source
- Support combined filters

### 2.2.8. Create tests for ParseAgent
- Write unit tests for parsing logic
- Test with sample STIX data
- Create tests for edge cases
- Verify search and filtering capabilities

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces and types for all models
- Implement efficient parsing algorithms
- Create a clean separation between parsing and indexing
- Include proper error handling for malformed data
- Add detailed logging for parsing operations
- Optimize for both memory usage and search performance

Start by creating the interface and models, then implement the STIX parser. Next, build the technique extraction and indexing capabilities, and finally add relationship mapping and filtering.

## ParseAgent Interface

Here's a suggested interface for the ParseAgent:

```typescript
interface ParseAgentConfig {
  includeSubtechniques: boolean;
  includeTactics: boolean;
  includeDataSources: boolean;
  extractKeywords: boolean;
}

interface TechniqueModel {
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

interface MitigationRef {
  id: string;                   // Mitigation ID
  name: string;                 // Mitigation name
  description?: string;         // Brief description
}

interface ParseAgentOutput {
  techniques: TechniqueModel[];              // List of all techniques
  techniqueIndex: Map<string, TechniqueModel>; // Index by ID
  tacticMap: Map<string, string[]>;           // Map tactics to technique IDs
  version: string;                            // ATT&CK version
}

interface ParseAgent {
  initialize(): Promise<void>;
  parse(mitreData: object): Promise<ParseAgentOutput>;
  findTechniqueById(id: string): TechniqueModel | null;
  searchTechniques(query: string): TechniqueModel[];
  filterTechniques(filters: TechniqueFilters): TechniqueModel[];
}

interface TechniqueFilters {
  tactics?: string[];
  platforms?: string[];
  dataSources?: string[];
  text?: string;
}
```

## STIX Object Types

The MITRE ATT&CK STIX bundle contains various object types:

- `attack-pattern`: Represents techniques and sub-techniques
- `course-of-action`: Represents mitigations
- `intrusion-set`: Represents threat groups
- `malware`: Represents malware used by threat actors
- `tool`: Represents tools used by threat actors
- `relationship`: Represents relationships between objects
- `x-mitre-tactic`: Represents tactics

For our purposes, focus primarily on `attack-pattern` objects and their relationships.

## Keyword Extraction Strategy

For improved matching, extract keywords from technique descriptions:

1. Tokenize the description text
2. Remove stop words (common words like "the", "and", etc.)
3. Extract technical terms using NLP techniques
4. Include specific terminology mentioned in the description
5. Add synonyms for common technical terms
6. Store the keywords in the technique model for fast searching

## Relationship Types

Important relationship types to extract:

- `subtechnique-of`: Links sub-techniques to parent techniques
- `mitigates`: Links mitigations to techniques
- `uses`: Links threat actors to techniques
- `detects`: Links data components to techniques

Focus on creating a rich, connected model that preserves these relationships for better analysis.
