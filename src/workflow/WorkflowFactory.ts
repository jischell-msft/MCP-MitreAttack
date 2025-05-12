import { WorkflowEngine } from './WorkflowEngine';
import { WorkflowDefinition } from './types';
import { createFetchTask } from './tasks/fetchTask';
import { createParseTask } from './tasks/parseTask';
import { createIngestTask } from './tasks/ingestTask';
import { createEvalTask } from './tasks/evalTask';
import { createReportTask } from './tasks/reportTask';
import { Config } from '../config/Config';
import { Logger } from '../utils/Logger';

/**
 * Factory for creating and registering workflow definitions
 */
export class WorkflowFactory {
    /**
     * Creates and registers all workflows with the engine
     */
    public static registerWorkflows(engine: WorkflowEngine, config: Config, logger: Logger): void {
        // Register document analysis workflow
        engine.registerWorkflow(
            WorkflowFactory.createDocumentAnalysisWorkflow(config)
        );

        // Register MITRE update workflow
        engine.registerWorkflow(
            WorkflowFactory.createMitreUpdateWorkflow(config)
        );

        logger.info('Registered all workflows');
    }

    /**
     * Creates the document analysis workflow
     */
    public static createDocumentAnalysisWorkflow(config: Config): WorkflowDefinition {
        return {
            id: 'document-analysis',
            name: 'Document Analysis Workflow',
            description: 'Analyzes a document against the MITRE ATT&CK framework',
            tasks: [
                createIngestTask(config),
                createFetchTask(config),
                createParseTask(),
                createEvalTask(config),
                createReportTask(config)
            ],
            dependencies: {
                'prepare-document': [],
                'fetch-mitre-data': [],
                'parse-mitre-data': ['fetch-mitre-data'],
                'evaluate-document': ['prepare-document', 'parse-mitre-data'],
                'generate-report': ['evaluate-document', 'parse-mitre-data', 'prepare-document']
            }
        };
    }

    /**
     * Creates the MITRE update workflow
     */
    public static createMitreUpdateWorkflow(config: Config): WorkflowDefinition {
        return {
            id: 'mitre-update',
            name: 'MITRE ATT&CK Update Workflow',
            description: 'Updates the local MITRE ATT&CK database',
            tasks: [
                createFetchTask(config),
                createParseTask()
            ],
            dependencies: {
                'fetch-mitre-data': [],
                'parse-mitre-data': ['fetch-mitre-data']
            }
        };
    }
}
