# MCP Server MITRE Integration Specifications

## Overview
This document outlines the specifications for a Multi-agent Coordination Platform (MCP) server that automatically fetches, processes, and evaluates documents or URLs against the MITRE ATT&CK framework. 

### Purpose
The system aims to automate the identification of potential security threats, tactics, techniques, and procedures (TTPs) within documents or web content by comparing them against the industry-standard MITRE ATT&CK knowledge base. This enables security analysts, threat intelligence teams, and cybersecurity researchers to rapidly assess content for potential security implications without manual review.

### Background
MITRE ATT&CK is a globally-accessible knowledge base of adversary tactics and techniques based on real-world observations. The ATT&CK framework is used as a foundation for the development of specific threat models and methodologies in the private sector, government, and the cybersecurity product and service community.

### System Scope
The MCP server will:
1. Automatically retrieve and maintain an up-to-date copy of the MITRE ATT&CK framework (enterprise-attack.json)
2. Accept URLs or document uploads from users through a web interface
3. Extract and analyze text content from these sources
4. Compare the extracted content against the ATT&CK framework using NLP techniques
5. Generate detailed reports highlighting potential security-relevant content
6. Store historical analyses for future reference
7. Provide a modern web interface for interaction and report viewing

### Target Users
- Security analysts performing threat intelligence analysis
- Automated security scanning systems
- Researchers evaluating security documentation
- Compliance teams checking for security-relevant content

## Core Requirements

### Functional Requirements

1. **MITRE ATT&CK Integration**
   - Automatically fetch the latest MITRE ATT&CK Enterprise matrix in JSON format
   - Update the local copy on a configurable schedule (default: weekly)
   - Parse and index the framework for efficient searching
   - Extract only relevant ATT&CK mappings (techniques, tactics, procedures)

2. **Document/URL Processing**
   - Accept URLs for direct analysis
   - Support common document formats (PDF, DOCX, TXT, HTML)
   - Extract text content preserving necessary context
   - Handle documents up to 50MB in size

3. **Analysis Engine**
   - Match document content against ATT&CK techniques with configurable sensitivity
   - Score matches based on confidence level (0-100%)
   - Filter matches to reduce false positives
   - Process documents in under 2 minutes for standard-sized content

4. **Reporting System**
   - Generate structured JSON reports of matches
   - Link to MITRE ATT&CK documentation for each match
   - Store historical reports with timestamps
   - Allow export of reports in multiple formats (JSON, CSV, PDF)

### Technical Requirements

1. **Platform**
   - Backend: Node.js (v16+) with TypeScript
   - Frontend: React with TypeScript
   - Containerization: Docker with Docker Compose

2. **Performance**
   - Process standard documents (< 5MB) in under 60 seconds
   - Handle multiple concurrent requests (minimum 5 simultaneous analyses)
   - Maximum memory usage: 1GB per analysis process

3. **Storage**
   - Database: SQLite (version 3.35+)
   - Persistent volume for database storage
   - Automatic database backup before updates

4. **Deployment**
   - Docker-based containerization
   - Caddy as reverse proxy
   - Minimal external dependencies
   - Single-command deployment

5. **Security**
   - Input validation for all user-submitted content
   - Sandboxed document processing
   - Rate limiting for API endpoints
   - No permanent storage of source documents (only analysis results)

6. **Scalability**
   - Stateless design for horizontal scaling
   - Configurable worker pool for parallel processing
   - Service-based architecture for component isolation

## Agent Structure

The system follows a multi-agent architecture pattern, dividing responsibilities into five specialized agents that communicate through a coordinated workflow. Each agent is implemented as a standalone module with clearly defined inputs and outputs.

### 1. FetchAgent

#### Purpose
Retrieve the latest MITRE ATT&CK JSON blob from GitHub and maintain the current version.

#### Detailed Responsibilities
- Schedule periodic checks for new versions (configurable via environment variables)
- Track version changes using ETags or last-modified headers
- Download the complete STIX bundle from GitHub or MITRE's STIX/TAXII endpoint
- Validate downloaded content integrity (schema validation, size checks)
- Maintain a versioned cache of previous downloads
- Log update events and changes
- Implement exponential backoff for failed retrieval attempts

#### Implementation Details
- **Data Sources**: 
  - Primary: `https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json`
  - Fallback: TAXII server endpoints
- **Tools**: axios with timeout handling, node-cron for scheduling
- **Caching**: File system with version tracking
- **Error Handling**: Retry logic, fallback sources, alerting
- **Output Format**: Raw JSON blob + metadata object with version and timestamp

#### Interface
```typescript
interface FetchAgentOutput {
  mitreData: object;            // Raw MITRE ATT&CK data
  version: string;              // Version identifier 
  timestamp: Date;              // Fetch timestamp
  source: string;               // Source URL
  changeDetected: boolean;      // Whether this is a new version
}
```

### 2. ParseAgent

#### Purpose
Transform the raw MITRE JSON into an optimized, searchable structure focused on techniques, tactics, and procedures.

#### Detailed Responsibilities
- Parse the complete STIX bundle
- Filter for relevant STIX objects (attack-patterns, relationships, intrusion-sets)
- Extract technique details including:
  - Technique ID and name
  - Description and detection strategies
  - Tactic categories
  - Data sources
  - Mitigation recommendations
- Build relationships between techniques and related objects
- Create an indexed structure for efficient searching
- Generate a unified internal model for techniques

#### Implementation Details
- **Input**: Raw MITRE ATT&CK STIX bundle
- **Processing**: STIX object filtering, relationship mapping
- **Indexing**: In-memory map with technique IDs as keys
- **Tools**: Custom STIX parser optimized for ATT&CK
- **Output Format**: Indexed collection of techniques with relationships

#### Interface
```typescript
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
}
```

### 3. DocIngestAgent

#### Purpose
Extract and normalize text content from various document formats and URLs for evaluation.

#### Detailed Responsibilities
- Accept URLs or document file paths as input
- For URLs:
  - Validate URL structure and accessibility
  - Download content with appropriate headers and timeout handling
  - Handle redirects and common HTTP errors
  - Extract text from HTML preserving necessary structure
- For documents:
  - Detect file format based on content and extension
  - Extract text using appropriate parser for each format
  - Preserve document structure when possible (headings, paragraphs)
- Clean and normalize the extracted text:
  - Remove extraneous whitespace, control characters
  - Standardize character encodings
  - Handle common text artifacts from extraction
  - Split into analyzable chunks if too large
- Prepare text for efficient analysis

#### Implementation Details
- **Supported Formats**:
  - Web: HTML, plain text
  - Documents: PDF, DOCX, TXT, RTF, Markdown
- **Tools**:
  - URL fetching: axios with timeout and retry logic
  - HTML parsing: cheerio or jsdom
  - PDF: pdf-parse with custom extraction options
  - DOCX: mammoth with style preservation
- **Text Processing**: Natural.js for initial text processing
- **Chunking**: Logic to break large documents into 10KB chunks with overlap
- **Error Handling**: Detailed extraction errors with page/section context

#### Interface
```typescript
interface DocIngestResult {
  sourceUrl?: string;           // Original URL if applicable
  sourceFile?: string;          // Original filename if applicable
  extractedText: string;        // Full extracted text
  textChunks?: string[];        // Text broken into processable chunks
  metadata: {                   // Document metadata
    title?: string;
    author?: string;
    createdDate?: Date;
    pageCount?: number;
    charCount: number;
  }
  format: string;               // Detected format
  extractionTimestamp: Date;    // When processing completed
}
```

### 4. EvalAgent

#### Purpose
Analyze document text to identify potential matches with MITRE ATT&CK techniques.

#### Detailed Responsibilities
- Process document text against the parsed techniques collection
- Implement multiple matching strategies:
  - Keyword-based matching with fuzzy search capabilities
  - TF-IDF similarity for weighing term importance
  - Entity recognition for identifying tools, malware, groups
  - Contextual matching considering surrounding text
- Score each potential match using a configurable algorithm
- Filter matches based on confidence thresholds (configurable)
- Group related techniques that appear in proximity
- Provide match context with relevant text snippets
- Handle large documents by processing in chunks
- Optimize for performance with batch processing

#### Implementation Details
- **Matching Algorithms**:
  - Primary: TF-IDF vector similarity using natural.js
  - Secondary: Fuzzy matching using Fuse.js (Levenshtein distance)
  - Tertiary: Regular expression patterns for specific technique signatures
- **Scoring Model**: Composite score (0-100) based on:
  - Exact keyword matches (highest weight)
  - Fuzzy/partial matches (medium weight)
  - Contextual relevance (supplementary)
- **Threshold**: Configurable minimum score (default: 65)
- **Performance**: Batch processing with worker threads for parallelization
- **Context**: Extract and store ±100 characters around each match

#### Interface
```typescript
interface EvalResult {
  matches: Array<{
    techniqueId: string;        // MITRE technique ID
    techniqueName: string;      // Technique name
    confidenceScore: number;    // Match confidence (0-100)
    matchedText: string;        // The text that triggered the match
    context: string;            // Surrounding text (for context)
    textPosition: {             // Position in document
      startChar: number;
      endChar: number;
    }
  }>;
  summary: {
    documentId: string;         // Document reference
    matchCount: number;         // Total matches found
    topTechniques: string[];    // Highest confidence matches
    tacticsCoverage: object;    // Tactics distribution
  }
}
```

### 5. ReportAgent

#### Purpose
Generate comprehensive, actionable reports from evaluation results and persist them for future reference.

#### Detailed Responsibilities
- Receive evaluation results with matched techniques
- Organize matches by tactic categories
- Generate executive summary with key findings
- Create detailed breakdown of each match
- Provide references to MITRE documentation
- Format report in multiple output styles (JSON, HTML, PDF)
- Store reports in the database with appropriate metadata
- Generate unique report IDs for future reference
- Implement search and filtering of historical reports
- Support report comparison functionality

#### Implementation Details
- **Report Storage**: SQLite database with indexed fields
- **Report Formats**:
  - API: JSON structure with full details
  - UI: Interactive HTML with expandable sections
  - Export: PDF with formatting and links
- **Database Tables**:
  - `reports`: Master report metadata
  - `matches`: Individual technique matches
- **Linking**: Direct links to MITRE ATT&CK website for each technique
- **Visualization**: Heatmap of tactics coverage (for UI)

#### Interface
```typescript
interface Report {
  id: string;                   // Unique report identifier
  timestamp: Date;              // Report generation time
  source: {                     // Document/URL info
    url?: string;
    filename?: string;
    metadata: object;
  }
  summary: {
    matchCount: number;         // Total matches
    highConfidenceCount: number; // Matches above 85% confidence
    tacticsBreakdown: object;   // Count by tactic
    topTechniques: Array<{      // Most confident matches
      id: string;
      name: string;
      score: number;
    }>;
  }
  detailedMatches: Array<{      // Full match details
    // (Same structure as EvalResult.matches)
  }>;
  mitreDatabaseVersion: string; // ATT&CK version used
}
```

## Orchestration

The orchestration layer is the central coordination mechanism that manages workflow execution, data flow between agents, error handling, and state persistence.

### Orchestration Engine

- **Primary Tool**: Taskt (TypeScript-compatible orchestration tool with SQLite support)
- **Architecture Pattern**: Task-based workflow with state management
- **Execution Model**: Sequential workflow with conditional branching

### Workflow Definition

1. **Standard Analysis Pipeline**
   ```
   FetchAgent → ParseAgent → DocIngestAgent → EvalAgent → ReportAgent
   ```

2. **Refresh Knowledge Base Pipeline**
   ```
   FetchAgent → ParseAgent → Database Update
   ```

3. **Re-evaluation Pipeline** (for historical documents against new ATT&CK versions)
   ```
   (Retrieve Document) → EvalAgent → ReportAgent
   ```

### State Management

- **Persistence Layer**: SQLite database with transaction support
- **State Data**: Workflow execution state, agent outputs, intermediate results
- **Recovery**: Ability to resume workflows from last successful step
- **Timeout Handling**: Configurable timeouts for each agent with recovery actions

### Task Definitions

Each task in the workflow corresponds to an agent's execution and is defined with:

- **Name**: Unique identifier (e.g., "fetch", "parse")
- **Handler**: Function implementing the task logic
- **Input**: Expected input parameters schema
- **Output**: Expected output schema
- **Timeout**: Maximum execution time
- **Retry Policy**: Number of retries and backoff strategy
- **Error Handlers**: Custom logic for specific error types

### Data Storage Schema

The orchestration engine will manage two primary types of data:

1. **Workflow Metadata**
   ```sql
   CREATE TABLE workflows (
     id TEXT PRIMARY KEY,
     type TEXT NOT NULL,                 -- "analysis", "refresh", "reeval"
     status TEXT NOT NULL,               -- "pending", "running", "completed", "failed"
     created_at DATETIME NOT NULL,
     updated_at DATETIME NOT NULL,
     source_url TEXT,                    -- For analysis workflows
     document_id TEXT,                   -- For reeval workflows
     current_step TEXT,                  -- Current execution step
     error TEXT,                         -- Error details if failed
     completion_time INTEGER             -- Execution time in ms
   );
   ```

2. **Task Results**
   ```sql
   CREATE TABLE task_results (
     id TEXT PRIMARY KEY,
     workflow_id TEXT NOT NULL,
     task_name TEXT NOT NULL,            -- "fetch", "parse", etc.
     status TEXT NOT NULL,               -- "completed", "failed"
     started_at DATETIME NOT NULL,
     completed_at DATETIME,
     result_data TEXT,                   -- JSON serialized result
     error TEXT,
     FOREIGN KEY(workflow_id) REFERENCES workflows(id)
   );
   ```

3. **Reports** (Final output)
   ```sql
   CREATE TABLE reports (
     id TEXT PRIMARY KEY,
     workflow_id TEXT NOT NULL,
     url TEXT,
     created_at DATETIME NOT NULL,
     mitre_version TEXT NOT NULL,
     summary_data TEXT,                  -- JSON serialized summary
     FOREIGN KEY(workflow_id) REFERENCES workflows(id)
   );
   ```

4. **Technique Matches** (Report details)
   ```sql
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

### Error Handling Strategy

1. **Transient Errors**: Automatic retry with exponential backoff
   - Network timeouts
   - Rate limiting
   - Temporary service unavailability

2. **Permanent Errors**: Fail workflow with detailed diagnostic information
   - Authentication failures
   - Malformed data
   - Unsupported document formats

3. **Partial Success**: Continue workflow with warnings
   - Document partially processed
   - Some techniques could not be evaluated

### Monitoring and Observability

- **Logging**: Structured JSON logs with correlation IDs
- **Metrics**:
  - Workflow execution times
  - Success/failure rates
  - Agent-specific performance metrics
- **Alerts**: Configurable alerts for workflow failures
- **Dashboards**: Visual representation of system health


## Web Interface Requirements

The web interface provides a modern, intuitive way for users to interact with the system, submit content for analysis, and view results.

### User Interface Architecture

- **Framework**: React (v18+) with TypeScript
- **State Management**: React Context API or Redux
- **Styling**: CSS-in-JS (styled-components) with a consistent design system
- **Responsive Design**: Support for desktop, tablet, and mobile viewports
- **Accessibility**: WCAG 2.1 AA compliance

### Key Interface Sections

1. **Analysis Submission**
   - URL input field with validation
   - Document upload with drag-and-drop support
   - Progress indicator for analysis
   - Submission history for quick reanalysis

2. **Results Dashboard**
   - Summary view with key metrics
   - Filtering and sorting options
   - Quick action buttons (export, share, delete)
   - Batch operations for multiple reports

3. **Detailed Report View**
   - Hierarchical display of matches by tactic
   - Confidence score visualization (color-coded)
   - Context snippets with matched text highlighted
   - Direct links to MITRE ATT&CK documentation
   - Collapsible sections for better navigation

4. **Settings & Administration**
   - ATT&CK database status and version
   - Manual update trigger
   - System status indicators
   - User preferences (theme, display options)

### User Interaction Flows

1. **New Analysis Flow**
   ```
   Enter URL or Upload Document → Validation → Submit →
   Processing Indicator → Results Display
   ```

2. **Historical Report Access Flow**
   ```
   Reports List → Apply Filters → Select Report →
   View Details → Export/Share (optional)
   ```

3. **Comparison Flow**
   ```
   Select Multiple Reports → Compare → View Differences →
   Export Comparison
   ```

### API Integration

The frontend will communicate with the backend through a RESTful API with the following endpoints:

#### Core Endpoints

1. **Analysis Management**
   - `POST /api/analyze` - Submit URL or document for analysis
     ```typescript
     // Request
     {
       url?: string;              // URL to analyze
       document?: File;           // Uploaded document
       options?: {                // Optional analysis parameters
         minConfidence: number;   // Minimum confidence threshold
         includeTactics: string[]; // Specific tactics to include
       }
     }
     
     // Response
     {
       jobId: string;             // Workflow tracking ID
       status: string;            // "submitted", "processing"
       estimatedTime: number;     // Estimated completion in seconds
     }
     ```

   - `GET /api/analyze/:jobId` - Check analysis status
     ```typescript
     // Response
     {
       jobId: string;
       status: string;            // "processing", "completed", "failed"
       progress: number;          // 0-100 completion percentage
       currentStep: string;       // Current processing step
       reportId?: string;         // Available when completed
       error?: string;            // Available when failed
     }
     ```

2. **Report Management**
   - `GET /api/reports` - List all reports with pagination
     ```typescript
     // Request parameters
     {
       page: number;              // Page number (default: 1)
       limit: number;             // Items per page (default: 20)
       sortBy: string;            // Field to sort by
       order: "asc" | "desc";     // Sort order
       filter?: {                 // Optional filters
         dateFrom?: string;       // ISO date string
         dateTo?: string;         // ISO date string
         url?: string;            // URL contains
         minMatches?: number;     // Minimum match count
       }
     }
     
     // Response
     {
       reports: [{
         id: string;
         url: string;
         timestamp: string;       // ISO date string
         matchCount: number;
         topTechniques: string[];
       }];
       pagination: {
         total: number;           // Total reports count
         pages: number;           // Total pages
         current: number;         // Current page
         hasNext: boolean;
         hasPrev: boolean;
       }
     }
     ```

   - `GET /api/reports/:id` - Get specific report details
     ```typescript
     // Response
     {
       id: string;
       url: string;
       timestamp: string;
       summary: {
         // Report summary data
       },
       matches: [{
         // Detailed match information
       }]
     }
     ```

   - `DELETE /api/reports/:id` - Delete a report
   - `POST /api/reports/export` - Export reports in various formats

3. **System Management**
   - `GET /api/system/status` - Get system status
   - `POST /api/system/update` - Trigger ATT&CK database update

### UI Component Specifications

1. **URL Submission Component**
   - Input field with URL validation
   - History dropdown with recent submissions
   - Submission button with loading state
   - Error message display

2. **Document Upload Component**
   - Drag-and-drop zone
   - File type validation
   - Size limit enforcement (50MB)
   - Upload progress indicator
   - Format support indicators

3. **Results Table Component**
   - Sortable columns
   - Pagination controls
   - Row selection for batch operations
   - Quick filter controls
   - Export button for selected/all items

4. **Technique Match Component**
   - Collapsible card design
   - Confidence score display (0-100 scale)
   - Tactic category label
   - Context snippet with highlighted match
   - "View in MITRE ATT&CK" link

5. **Report Summary Component**
   - Tactics coverage visualization
   - Top techniques highlight
   - Match count statistics
   - Source information
   - Analysis timestamp

### Accessibility Requirements

- Keyboard navigation support for all interactions
- Screen reader compatibility
- Sufficient color contrast (minimum 4.5:1)
- Focus indicators for interactive elements
- Alternative text for all non-text content
- Proper heading structure and ARIA attributes

### Performance Targets

- Initial load time: < 2 seconds
- Time to interactive: < 3 seconds
- Response to user input: < 100ms
- Smooth animations (60fps)
- Efficient rendering of large result sets

## Deployment Architecture

The system is designed for containerized deployment using Docker and Docker Compose, enabling consistent environments across development and production.

### Container Architecture

The application is divided into three main containerized services:

1. **Backend Service**
   - **Base Image**: Node 18 Alpine
   - **Runtime Environment**: Node.js with TypeScript runtime
   - **Resource Allocation**:
     - CPU: 1-2 cores (configurable)
     - Memory: 1GB minimum, 2GB recommended
   - **Scaling Strategy**: Horizontal scaling with multiple container instances
   - **Health Check**: HTTP endpoint at `/health` returning service status
   - **Restart Policy**: Always with exponential backoff

2. **Frontend Service**
   - **Build Stage**: Node.js environment for building React application
   - **Serve Stage**: Nginx Alpine for serving static assets
   - **Resource Allocation**:
     - CPU: 0.5 cores
     - Memory: 256MB
   - **Build Optimization**: Production-optimized bundle with code splitting
   - **Caching Strategy**: Aggressive caching of static assets

3. **Reverse Proxy (Caddy)**
   - **Image**: Official Caddy Alpine
   - **Configuration**: Custom Caddyfile for routing
   - **SSL/TLS**: Automatic HTTPS certificate provisioning and renewal
   - **Resource Allocation**:
     - CPU: 0.5 cores
     - Memory: 128MB
   - **Security Headers**: Strict security policy configuration

### Network Configuration

- **Exposed Ports**:
  - 80/TCP: HTTP (redirected to HTTPS in production)
  - 443/TCP: HTTPS (in production environments)
- **Internal Network**:
  - Backend service: Port 3001 (internal only)
  - Frontend service: Port 4173 (internal only)
- **Routing Rules**:
  - `/api/*`: Routed to backend service
  - `/*`: Routed to frontend service
- **Security**:
  - TLS 1.2+ only in production
  - HTTP/2 enabled
  - HSTS headers configured

### Data Storage

- **Database**: SQLite 3.35+
- **Volume Configuration**:
  - Named volume for database file
  - Configured for persistence across container restarts
- **Backup Strategy**:
  - Scheduled database dumps to separate volume
  - Retention policy: 7 days of daily backups
- **Data Migration**:
  - Schema version tracking
  - Automatic migration on startup

### Configuration Management

- **Environment Variables**:
  - Runtime configuration via environment variables
  - Separate `.env` files for development/production
  - Secrets management recommendations
- **Configuration Categories**:
  - Network settings
  - Database connection parameters
  - Feature flags
  - Performance tuning parameters
  - Logging levels

### High-Level Deployment Diagram

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Caddy    │ ← HTTPS termination
                    │ Reverse Proxy│ ← Routing
                    └──────┬──────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
    ┌─────────────┐                 ┌─────────────┐
    │  Frontend   │                 │   Backend   │
    │   (React)   │                 │  (Node.js)  │
    └─────────────┘                 └──────┬──────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │   SQLite    │
                                    │  Database   │
                                    └─────────────┘
```

### Resource Requirements

- **Minimum System Requirements**:
  - CPU: 2 cores
  - RAM: 2GB
  - Storage: 5GB available
- **Recommended System Requirements**:
  - CPU: 4 cores
  - RAM: 4GB
  - Storage: 20GB available
- **Network Requirements**:
  - Outbound internet access for MITRE ATT&CK data retrieval
  - Inbound access to HTTP/HTTPS ports for user access
  - DNS resolution capabilities

### Deployment Process

1. **Initial Setup**
   - Clone repository
   - Configure environment variables
   - Ensure Docker and Docker Compose are installed

2. **Build and Deploy**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Verification**
   - Check container health status
   - Verify API accessibility
   - Confirm web interface is available

4. **Maintenance Operations**
   - Database backup: `docker-compose exec backend sh -c 'sqlite3 tasks.db .dump > /backups/backup-$(date +%Y%m%d).sql'`
   - Container logs: `docker-compose logs -f [service]`
   - Update containers: `docker-compose pull && docker-compose up -d`
   - Force rebuild: `docker-compose up -d --build`

### Security Considerations

- **Container Security**:
  - Non-root user execution
  - Read-only filesystem where possible
  - Minimal container image size
  - Regular security updates

- **Application Security**:
  - Input validation on all endpoints
  - Output encoding to prevent XSS
  - Rate limiting on submission endpoints
  - Timeout policies for long-running operations

- **Infrastructure Security**:
  - Firewall configuration recommendations
  - Access control best practices
  - Monitoring and alerting setup


## Technical Stack

The system utilizes a modern, maintainable, and efficient technology stack designed for performance, security, and developer productivity.

### Core Technologies

#### Backend Stack

- **Runtime Environment**
  - **Node.js**: v16+ LTS
  - **TypeScript**: v4.7+
  - **Express.js**: v4.18+ for API routing
  - **ts-node**: For TypeScript execution
  - **nodemon**: For development live reloading

- **Database**
  - **SQLite**: v3.35+ 
  - **SQL Query Builder**: Knex.js or better-sqlite3
  - **Migration Tool**: Integrated with query builder
  - **Connection Pooling**: Custom implementation

- **Orchestration**
  - **Taskt**: Lightweight workflow orchestration library
  - **Task Queues**: In-memory for development, persistent for production
  - **State Management**: SQLite-backed persistence
  - **Error Handling**: Custom retry and recovery logic

- **Document Processing**
  - **HTTP Client**: axios with configurable timeouts
  - **HTML Parsing**: cheerio / jsdom
  - **PDF Processing**: pdf-parse
  - **DOCX Processing**: mammoth
  - **Text Extraction**: custom pipeline with natural.js

- **Analysis Engine**
  - **Text Analysis**: natural.js for TF-IDF and tokenization
  - **Fuzzy Matching**: Fuse.js for approximate text matching
  - **Scoring Algorithm**: Custom implementation with configurable weights
  - **Parallelization**: Worker threads for processing intensive tasks

#### Frontend Stack

- **Framework**
  - **React**: v18+
  - **TypeScript**: v4.7+
  - **React Router**: v6+ for client-side routing
  - **React Query**: For API data fetching and caching

- **UI Components**
  - **Component Library**: Either custom components or open-source library
  - **Styling Solution**: Styled-components or Emotion
  - **Design System**: Custom implementation with tokens
  - **Responsive Layout**: CSS Grid and Flexbox

- **State Management**
  - **Local State**: React hooks (useState, useReducer)
  - **Global State**: React Context API or Redux (if complexity warrants it)
  - **Form Management**: React Hook Form
  - **Data Validation**: Zod or Yup

- **Build Tools**
  - **Bundler**: Vite for development and production builds
  - **Module Format**: ES Modules
  - **Optimization**: Code splitting, tree shaking, lazy loading
  - **Asset Management**: Built-in Vite processing

#### DevOps & Infrastructure

- **Containerization**
  - **Docker**: Latest stable version
  - **Docker Compose**: v2+ for multi-container orchestration
  - **Base Images**: Alpine variants for minimal size
  - **Multi-stage Builds**: For optimized container images

- **Reverse Proxy**
  - **Caddy**: v2+ for HTTP/HTTPS routing and TLS termination
  - **Configuration**: Caddyfile with environment variable substitution
  - **TLS**: Automatic certificate management

- **Monitoring & Logging**
  - **Logging**: Structured JSON logs
  - **Log Management**: Console output in development, file-based in production
  - **Performance Monitoring**: Optional NewRelic or Datadog integration
  - **Error Tracking**: Custom solution or integration with Sentry

### Development Tools

- **Version Control**
  - **Git**: Latest version
  - **Branch Strategy**: GitHub Flow or GitLab Flow
  - **Commit Conventions**: Conventional Commits

- **Code Quality**
  - **Linting**: ESLint with TypeScript support
  - **Formatting**: Prettier
  - **Static Analysis**: TypeScript compiler at strict level
  - **Pre-commit Hooks**: husky + lint-staged

- **Testing**
  - **Unit Testing**: Jest or Vitest
  - **Component Testing**: React Testing Library
  - **API Testing**: Supertest
  - **Test Runners**: Integrated with package scripts

- **Documentation**
  - **API Documentation**: OpenAPI / Swagger
  - **Code Documentation**: TSDoc comments
  - **Architecture Documentation**: Markdown + diagrams

### External Dependencies and Libraries

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **HTTP Communication** | axios | ^1.0.0 | API requests with retry capabilities |
| **Database** | better-sqlite3 | ^8.0.0 | SQLite interface with better performance |
| | knex | ^2.0.0 | SQL query builder |
| **Document Processing** | pdf-parse | ^1.1.1 | Extract text from PDF documents |
| | mammoth | ^1.5.0 | Convert DOCX to HTML/text |
| | cheerio | ^1.0.0 | Parse and manipulate HTML content |
| **Text Analysis** | natural | ^6.0.0 | NLP utilities, TF-IDF, tokenization |
| | fuse.js | ^6.6.0 | Fuzzy search algorithm |
| **API Server** | express | ^4.18.0 | HTTP server framework |
| | cors | ^2.8.5 | Cross-origin resource sharing |
| | helmet | ^6.0.0 | HTTP security headers |
| | express-rate-limit | ^6.0.0 | API rate limiting |
| **Frontend** | react | ^18.0.0 | UI library |
| | react-dom | ^18.0.0 | DOM bindings for React |
| | react-router-dom | ^6.0.0 | Client-side routing |
| | styled-components | ^5.3.0 | CSS-in-JS styling |
| | react-query | ^4.0.0 | Data fetching and caching |
| **Utility** | date-fns | ^2.29.0 | Date manipulation |
| | lodash | ^4.17.0 | General utility functions |
| | zod | ^3.0.0 | Runtime type validation |
| **Testing** | jest | ^29.0.0 | Testing framework |
| | supertest | ^6.0.0 | HTTP testing |
| | testing-library/react | ^13.0.0 | React component testing |

### Compatibility Matrix

| Aspect | Minimum | Recommended | Notes |
|--------|---------|-------------|-------|
| **Node.js** | v16.x LTS | v18.x LTS | Need support for ESM and fetch API |
| **Web Browsers** | Last 2 versions of major browsers | Last 3 versions | IE not supported |
| **Mobile Devices** | iOS 13+, Android 8+ | iOS 15+, Android 10+ | Responsive design principles |
| **SQLite** | v3.35.0 | v3.39.0+ | Requires JSON functions |
| **Docker** | v20.10.0 | Latest stable | For containerization |
| **Docker Compose** | v2.2.0 | Latest v2.x | Multi-container orchestration |

### Integration Points

- **MITRE ATT&CK API**: Access to the latest Enterprise ATT&CK matrix
- **Content Extraction**: Libraries for document format support
- **Content Analysis**: NLP tools for text matching and analysis
- **Web Browser Compatibility**: Support for modern browsers
- **Container Orchestration**: Docker Compose for service coordination

### Extension Points

The system is designed to be extensible through several predefined mechanisms:

1. **Agent Plugins**: Custom implementations of agent interfaces
2. **Custom Matchers**: Additional matching algorithms for the EvalAgent
3. **Report Formatters**: Custom report formats for different output needs
4. **Authentication Providers**: Pluggable authentication system (future)
5. **Storage Backends**: Alternative storage options beyond SQLite (future)

