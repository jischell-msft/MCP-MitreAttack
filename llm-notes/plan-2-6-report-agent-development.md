# ReportAgent Development

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. The ReportAgent is responsible for taking evaluation results from the EvalAgent, generating comprehensive reports, and persisting them in the database for future reference.

## Requirements
- Generate structured reports from evaluation results
- Organize matches by tactic categories
- Create executive summaries with key findings
- Persist reports in the database
- Support multiple output formats (JSON, HTML, CSV)

## Tasks

### 2.6.1. Create ReportAgent interface and model
- Define the ReportAgent interface
- Create data models for reports
- Define input/output specifications
- Implement configuration options

### 2.6.2. Implement report generation from matches
- Create report structure
- Organize matches by tactics
- Generate executive summary
- Create technique coverage metrics

### 2.6.3. Create database storage operations
- Implement report persistence
- Create match storage
- Add metadata management
- Implement transaction handling

### 2.6.4. Implement report retrieval logic
- Create report lookup by ID
- Implement filtering capabilities
- Add pagination support
- Create efficient query patterns

### 2.6.5. Add report formatting capabilities
- Implement JSON output format
- Create HTML report template
- Add CSV export functionality
- Support PDF generation (optional)

### 2.6.6. Create summary generation
- Implement executive summary algorithm
- Add statistics calculation
- Create tactic coverage analysis
- Generate key findings section

### 2.6.7. Implement report export functionality
- Create export API endpoints
- Support multiple formats
- Add file generation
- Implement download handling

### 2.6.8. Create tests for ReportAgent
- Write unit tests for report generation
- Create integration tests with database
- Test all output formats
- Verify query performance

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces and types
- Follow the repository pattern for database operations
- Implement efficient database queries
- Create well-structured reports
- Include proper error handling
- Design for both API consumption and human readability

Start by creating the interface and models, then implement report generation and database operations. Next, add report retrieval and formatting capabilities, and finally implement summary generation and export functionality.

## ReportAgent Interface

Here's a suggested interface for the ReportAgent:

```typescript
interface ReportAgentConfig {
  defaultFormat: 'json' | 'html' | 'csv' | 'pdf';
  includeRawMatches: boolean;
  maxMatchesInSummary: number;
  confidenceThreshold: number;
  includeTacticBreakdown: boolean;
}

interface Report {
  id: string;                   // Unique report identifier
  timestamp: Date;              // Report generation time
  source: {                     // Document/URL info
    url?: string;
    filename?: string;
    metadata: object;
  };
  summary: {
    matchCount: number;         // Total matches
    highConfidenceCount: number; // Matches above threshold
    tacticsBreakdown: Record<string, number>;   // Count by tactic
    topTechniques: Array<{      // Most confident matches
      id: string;
      name: string;
      score: number;
    }>;
    keyFindings: string[];      // Key findings text
  };
  detailedMatches: Array<EvalMatch>; // Full match details
  mitreDatabaseVersion: string; // ATT&CK version used
}

interface ReportAgent {
  initialize(): Promise<void>;
  generateReport(evalResult: EvalResult, documentInfo: DocumentInfo): Promise<Report>;
  saveReport(report: Report): Promise<string>; // Returns report ID
  getReportById(id: string): Promise<Report | null>;
  searchReports(filters: ReportFilters): Promise<ReportSearchResult>;
  exportReport(id: string, format: string): Promise<Buffer>;
  deleteReport(id: string): Promise<boolean>;
}

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  url?: string;
  minMatches?: number;
  techniques?: string[];
  tactics?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ReportSearchResult {
  reports: Report[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Database Schema for Reports

The ReportAgent will use the database schema defined in the database foundation step:

```sql
-- Reports table for analysis results
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  url TEXT,
  created_at DATETIME NOT NULL,
  mitre_version TEXT NOT NULL,
  summary_data TEXT,                  -- JSON serialized summary
  FOREIGN KEY(workflow_id) REFERENCES workflows(id)
);

-- Matches table for technique matches
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL,
  technique_id TEXT NOT NULL,
  technique_name TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  context_text TEXT,
  FOREIGN KEY(report_id) REFERENCES reports(id)
);
```

## Summary Generation Strategy

Create an intelligent summary that highlights the most important findings:

1. **Executive Summary**:
   - Total number of techniques detected
   - Distribution across tactics
   - Highest confidence matches
   - Common themes or patterns

2. **Key Findings**:
   - Generated from high-confidence matches
   - Focus on critical techniques
   - Group related techniques
   - Highlight unusual or concerning patterns

3. **Tactics Coverage**:
   - Analysis of which tactics were detected
   - Gaps in the attack chain
   - Visualization of coverage (for HTML reports)
   - Comparison to typical patterns

Example summary generation algorithm:

```typescript
function generateSummary(matches: EvalMatch[], documentInfo: DocumentInfo): ReportSummary {
  // Basic statistics
  const matchCount = matches.length;
  const highConfidenceMatches = matches.filter(m => m.confidenceScore >= 85);
  const highConfidenceCount = highConfidenceMatches.length;
  
  // Tactics breakdown
  const tacticsBreakdown = calculateTacticsBreakdown(matches);
  
  // Top techniques (highest confidence)
  const topTechniques = [...matches]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5)
    .map(m => ({
      id: m.techniqueId,
      name: m.techniqueName,
      score: m.confidenceScore
    }));
  
  // Generate key findings
  const keyFindings = generateKeyFindings(matches, tacticsBreakdown);
  
  return {
    matchCount,
    highConfidenceCount,
    tacticsBreakdown,
    topTechniques,
    keyFindings
  };
}

function calculateTacticsBreakdown(matches: EvalMatch[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  // Get tactics for each technique
  for (const match of matches) {
    const technique = getTechniqueById(match.techniqueId);
    if (!technique) continue;
    
    for (const tactic of technique.tactics) {
      breakdown[tactic] = (breakdown[tactic] || 0) + 1;
    }
  }
  
  return breakdown;
}

function generateKeyFindings(
  matches: EvalMatch[], 
  tacticsBreakdown: Record<string, number>
): string[] {
  const findings: string[] = [];
  
  // Finding 1: Most prevalent tactic
  const mostPrevalentTactic = findMostPrevalentTactic(tacticsBreakdown);
  if (mostPrevalentTactic) {
    findings.push(
      `The document contains multiple references to the ${mostPrevalentTactic} tactic,