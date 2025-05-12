# EvalAgent with Local Processing

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. The EvalAgent is responsible for analyzing document text to identify potential matches with MITRE ATT&CK techniques. This plan focuses on implementing the local processing capabilities of the EvalAgent, which will serve as a foundation and fallback for the Azure OpenAI-based evaluation.

## Requirements
- Process document text against the parsed techniques collection
- Implement basic text matching algorithms
- Create a TF-IDF vectorization approach for similarity
- Score matches based on confidence level
- Extract match context with relevant text snippets
- Handle large documents by processing in chunks

## Tasks

### 2.4.1. Create EvalAgent interface and model
- Define the EvalAgent interface
- Create data models for matches and results
- Define input/output specifications
- Implement configuration options

### 2.4.2. Implement basic keyword matching
- Create simple keyword extraction
- Implement matching against technique keywords
- Add case-insensitive matching
- Create scoring based on keyword frequency

### 2.4.3. Add TF-IDF vectorization for documents
- Implement TF-IDF calculation
- Create document vectorization
- Vectorize technique descriptions
- Implement cosine similarity calculation

### 2.4.4. Create similarity scoring algorithm
- Develop combined scoring approach
- Implement threshold-based filtering
- Create confidence level calculation
- Add weighting for different match types

### 2.4.5. Implement match context extraction
- Extract text surrounding matches
- Implement sentence boundary detection
- Create context window calculation
- Preserve formatting in context

### 2.4.6. Create confidence scoring model
- Design confidence score scale (0-100)
- Implement multi-factor scoring
- Add normalization of scores
- Create thresholds for confidence levels

### 2.4.7. Build match result structure
- Create comprehensive match objects
- Add metadata for each match
- Implement sorting by confidence
- Create grouping of related matches

### 2.4.8. Create tests for local EvalAgent
- Write unit tests for matching algorithms
- Create integration tests with sample documents
- Test performance with large documents
- Verify confidence scoring accuracy

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces and types
- Optimize for both accuracy and performance
- Implement efficient text processing algorithms
- Include proper error handling
- Add detailed logging for matching operations
- Create a modular design for easy extension

Start by creating the interface and models, then implement the basic keyword matching. Next, add TF-IDF vectorization and similarity scoring. Finally, implement match context extraction and confidence scoring.

## EvalAgent Interface

Here's a suggested interface for the EvalAgent:

```typescript
interface EvalAgentConfig {
  minConfidenceScore: number;    // Minimum confidence score (0-100)
  maxMatches: number;            // Maximum matches to return
  contextWindowSize: number;     // Number of characters for context
  useKeywordMatching: boolean;   // Whether to use keyword matching
  useTfIdfMatching: boolean;     // Whether to use TF-IDF matching
  useFuzzyMatching: boolean;     // Whether to use fuzzy matching
}

interface EvalMatch {
  techniqueId: string;        // MITRE technique ID
  techniqueName: string;      // Technique name
  confidenceScore: number;    // Match confidence (0-100)
  matchedText: string;        // The text that triggered the match
  context: string;            // Surrounding text (for context)
  textPosition: {             // Position in document
    startChar: number;
    endChar: number;
  }
  matchSource: "keyword" | "tfidf" | "fuzzy";  // Source of the match
}

interface EvalResult {
  matches: EvalMatch[];
  summary: {
    documentId: string;         // Document reference
    matchCount: number;         // Total matches found
    topTechniques: string[];    // Highest confidence matches
    tacticsCoverage: object;    // Tactics distribution
    processingTimeMs: number;   // Total processing time
  }
}

interface EvalAgent {
  initialize(techniques: TechniqueModel[]): Promise<void>;
  evaluate(document: string): Promise<EvalResult>;
  evaluateChunk(chunk: string): Promise<EvalMatch[]>;
  getConfidenceScore(match: any): number;
  extractContext(text: string, matchPosition: number): string;
  filterMatches(matches: EvalMatch[]): EvalMatch[];
}
```

## Text Matching Approaches

Implement multiple matching approaches for better results:

1. **Keyword Matching**:
   - Extract keywords from techniques
   - Find exact matches in document
   - Score based on frequency and specificity
   - Quick but may miss contextual matches

2. **TF-IDF Vectorization**:
   - Create document vectors using TF-IDF
   - Calculate similarity with technique vectors
   - Provides better semantic matching
   - More computationally intensive

3. **Fuzzy Matching**:
   - Use Levenshtein distance for fuzzy matching
   - Handle misspellings and variations
   - Score based on similarity ratio
   - Useful for finding near-matches

## Confidence Scoring Strategy

Implement a multi-factor confidence scoring approach:

1. Base score from primary match method (0-80 points)
2. Bonus points for multiple matching methods (up to +10)
3. Contextual relevance boost (up to +10)
4. Penalties for common false positives (-5 to -20)
5. Normalize final score to 0-100 range

Example scoring algorithm:

```typescript
function calculateConfidence(match: any): number {
  let score = 0;
  
  // Base score from primary match
  if (match.source === "keyword") {
    score = match.keywordScore * 80; // 0-80 based on keyword match
  } else if (match.source === "tfidf") {
    score = match.similarity * 80; // 0-80 based on cosine similarity
  } else if (match.source === "fuzzy") {
    score = match.ratio * 70; // 0-70 based on fuzzy match ratio
  }
  
  // Bonus for multiple match types
  if (match.matchedByMultipleMethods) {
    score += 10;
  }
  
  // Context relevance boost
  if (containsRelatedTerms(match.context)) {
    score += 10;
  }
  
  // Penalties for potential false positives
  if (isCommonTerm(match.matchedText)) {
    score -= 15;
  }
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}
```

## Performance Optimization

For large documents, consider these optimizations:

1. Process documents in chunks
2. Use worker threads for parallel processing
3. Implement early filtering of techniques
4. Cache intermediate results
5. Use efficient data structures for lookups
6. Optimize TF-IDF calculation for sparse matrices