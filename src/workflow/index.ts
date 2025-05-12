// Export all workflow modules
export * from './types';
export * from './document-workflow';
export * from './workflow-engine';
export * from './error-handler';
export * from './transaction';
export * from './agents/agent-integration';
export * from './workflow-testing';

// Main workflow registration
import { WorkflowEngine } from './workflow-engine';
import { documentAnalysisWorkflow, mitreUpdateWorkflow } from './document-workflow';

/**
 * Registers all workflow definitions with the workflow engine
 * @param engine The workflow engine instance
 */
export function registerWorkflows(engine: WorkflowEngine): void {
    engine.registerWorkflow(documentAnalysisWorkflow);
    engine.registerWorkflow(mitreUpdateWorkflow);
}
