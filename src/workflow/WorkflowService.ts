import { WorkflowEngine } from './WorkflowEngine';
import { WorkflowFactory } from './WorkflowFactory';
import { WorkflowContext } from './types';
import { Database } from '../db/Database';
import { Logger } from '../utils/Logger';
import { Config } from '../config/Config';

/**
 * Service for interacting with workflows
 */
export class WorkflowService {
    private engine: WorkflowEngine;
    private logger: Logger;

    /**
     * Creates a new workflow service instance
     */
    constructor(db: Database, logger: Logger, config: Config) {
        this.logger = logger;
        this.engine = new WorkflowEngine(db, logger);

        // Register all workflows
        WorkflowFactory.registerWorkflows(this.engine, config, logger);
    }

    /**
     * Analyzes a URL by submitting it to the document analysis workflow
     */
    public async analyzeUrl(url: string, options?: any): Promise<string> {
        this.logger.info(`Starting URL analysis for: ${url}`);

        const context = await this.engine.executeWorkflow('document-analysis', {
            url,
            options
        });

        return context.workflowId;
    }

    /**
     * Analyzes a document by submitting it to the document analysis workflow
     */
    public async analyzeDocument(documentPath: string, documentName: string, options?: any): Promise<string> {
        this.logger.info(`Starting document analysis for: ${documentName}`);

        const context = await this.engine.executeWorkflow('document-analysis', {
            documentPath,
            documentName,
            options
        });

        return context.workflowId;
    }

    /**
     * Updates the MITRE ATT&CK database
     */
    public async updateMitreDatabase(): Promise<string> {
        this.logger.info('Starting MITRE ATT&CK database update');

        const context = await this.engine.executeWorkflow('mitre-update', {});

        return context.workflowId;
    }

    /**
     * Gets the status of a workflow
     */
    public async getWorkflowStatus(workflowId: string): Promise<WorkflowContext | null> {
        return this.engine.getContext(workflowId);
    }

    /**
     * Cancels a running workflow
     */
    public async cancelWorkflow(workflowId: string): Promise<boolean> {
        return this.engine.cancelWorkflow(workflowId);
    }

    /**
     * Lists all workflows with optional status filter
     */
    public async listWorkflows(status?: string): Promise<WorkflowContext[]> {
        return this.engine.listWorkflows(status);
    }
}
