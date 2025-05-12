/**
 * Agent Interfaces
 * 
 * This directory will contain implementations for:
 * - FetchAgent: Retrieves MITRE ATT&CK data
 * - ParseAgent: Parses and indexes MITRE data
 * - DocIngestAgent: Handles document ingestion and processing
 * - EvalAgent: Evaluates documents against MITRE data
 * - ReportAgent: Generates reports from evaluation results
 */

// Base agent interface
export interface Agent {
    initialize(): Promise<void>;
    getName(): string;
    getVersion(): string;
}

// Export fetch agent
export * from './fetch';
