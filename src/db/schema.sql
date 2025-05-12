-- MCP-MitreAttack Database Schema

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
