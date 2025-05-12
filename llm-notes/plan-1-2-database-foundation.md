# Database Foundation

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on setting up the database foundation for the application. The system will use SQLite for data persistence, storing MITRE ATT&CK data, analysis results, and workflow state.

## Requirements
- Set up SQLite database connection
- Create database schema for reports, matches, and system data
- Implement database operations using a clean repository pattern
- Ensure proper error handling and transaction support

## Tasks

### 1.2.1. Install SQLite and database libraries
- Install better-sqlite3 as the primary SQLite driver
- Install knex as SQL query builder
- Add any other necessary database utilities

### 1.2.2. Create database connection utility
- Implement a database connection manager
- Add configuration for SQLite connection
- Implement connection pooling if necessary
- Create utility for transaction management

### 1.2.3. Design database schema SQL file
Create a SQL schema file with the following tables:
- `workflows` - Track workflow execution
- `task_results` - Store intermediate task results
- `reports` - Store analysis reports
- `matches` - Store technique matches from analysis
- `mitre_techniques` - Cache of MITRE ATT&CK techniques
- Include proper indexes, constraints, and relationships

### 1.2.4. Implement schema migration functions
- Create a migration system for database schema changes
- Implement up/down migrations
- Add versioning for database schema
- Create utility to check and update schema

### 1.2.5. Create base repository pattern for data access
- Implement a generic repository interface
- Create a base repository class
- Add CRUD operations
- Implement query building functionality

### 1.2.6. Implement report repository
- Create a repository for report data
- Implement methods for storing and retrieving reports
- Add filtering and pagination support
- Implement relationship with matches

### 1.2.7. Implement match repository
- Create a repository for technique matches
- Implement methods for storing and retrieving matches
- Add relationship with reports
- Implement filtering capabilities

### 1.2.8. Create database tests
- Write unit tests for repository implementations
- Add integration tests for database operations
- Create fixtures for testing
- Implement test database setup and teardown

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces for data models
- Implement proper error handling for database operations
- Use transactions for multi-step operations
- Follow the repository pattern for data access
- Use parameterized queries to prevent SQL injection
- Include proper documentation for database schema and operations

Start by installing the necessary dependencies and creating the database connection utility. Then implement the schema and migration system. Finally, create the repositories for data access.

## Sample Database Schema

Here's a starting point for the database schema:

```sql
-- Workflows table to track execution
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

-- Task results for intermediate data
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

-- Cached MITRE techniques
CREATE TABLE mitre_techniques (
  id TEXT PRIMARY KEY,                -- Technique ID (e.g., "T1566")
  name TEXT NOT NULL,                 -- Technique name
  description TEXT NOT NULL,          -- Full description
  tactics TEXT NOT NULL,              -- JSON array of tactics
  data_sources TEXT,                  -- JSON array of data sources
  platforms TEXT,                     -- JSON array of platforms
  detection TEXT,                     -- Detection guidance
  mitigations TEXT,                   -- JSON array of mitigations
  url TEXT,                           -- Link to MITRE documentation
  keywords TEXT,                      -- JSON array of keywords
  version TEXT NOT NULL,              -- ATT&CK version
  updated_at DATETIME NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_task_results_workflow ON task_results(workflow_id);
CREATE INDEX idx_reports_workflow ON reports(workflow_id);
CREATE INDEX idx_matches_report ON matches(report_id);
CREATE INDEX idx_matches_technique ON matches(technique_id);
```
