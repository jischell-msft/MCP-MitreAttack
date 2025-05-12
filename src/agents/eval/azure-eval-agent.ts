import { Agent } from '../index';
import { EvalAgent as LocalEvalAgent } from './eval-agent';
import { AzureEval } from './azure-eval';
import { TechniqueModel } from '../parse/types';
import { EvalMatch, EvalResult, EvalAgentConfig } from './types';
import { logger } from '../../utils/logger';
import { AZURE_OPENAI_CONFIG } from '../../config';

/**
 * Extended configuration for Azure OpenAI enhanced EvalAgent
 */
export interface AzureEvalAgentConfig extends EvalAgentConfig {
    azureOpenAI: {
        useAzureOpenAI: boolean;
        endpoint: string;
        apiKey?: string;
        deploymentName: string;
        apiVersion: string;
        maxTokens: number;
        temperature: number;
        timeout: number;
        retryCount: number;
        useAzureAD?: boolean;
    };
}

/**
 * EvalAgent that uses Azure OpenAI when available, falling back to local processing
 */
export class AzureEvalAgent implements Agent {
    private config: AzureEvalAgentConfig;
    private localAgent: LocalEvalAgent;
    private azureEval: AzureEval | null = null;
    private isInitialized = false;
    private techniques: TechniqueModel[] = [];

    /**
     * Create a new Azure OpenAI enhanced EvalAgent
     * @param config Configuration options
     */
    constructor(config: Partial<AzureEvalAgentConfig> = {}) {
        // Set default configuration
        this.config = {
            minConfidenceScore: 65,
            maxMatches: 100,
            contextWindowSize: 200,
            useKeywordMatching: true,
            useTfIdfMatching: true,
            useFuzzyMatching: true,
            azureOpenAI: {
                useAzureOpenAI: true,
                endpoint: AZURE_OPENAI_CONFIG.endpoint,
                apiKey: AZURE_OPENAI_CONFIG.apiKey,
                deploymentName: AZURE_OPENAI_CONFIG.deploymentName,
                apiVersion: AZURE_OPENAI_CONFIG.apiVersion,
                maxTokens: AZURE_OPENAI_CONFIG.maxTokens,
                temperature: AZURE_OPENAI_CONFIG.temperature,
                timeout: AZURE_OPENAI_CONFIG.timeout,
                retryCount: AZURE_OPENAI_CONFIG.retryCount,
                useAzureAD: false
            },
            ...config
        };

        // Create local evaluation agent as fallback
        this.localAgent = new LocalEvalAgent({
            minConfidenceScore: this.config.minConfidenceScore,
            maxMatches: this.config.maxMatches,
            contextWindowSize: this.config.contextWindowSize,
            useKeywordMatching: this.config.useKeywordMatching,
            useTfIdfMatching: this.config.useTfIdfMatching,
            useFuzzyMatching: this.config.useFuzzyMatching,
        });
    }

    /**
     * Get the agent name
     */
    getName(): string {
        return 'AzureEvalAgent';
    }

    /**
     * Get the agent version
     */
    getVersion(): string {
        return '1.0.0';
    }

    /**
     * Initialize the agent with MITRE techniques
     * @param techniques MITRE techniques to evaluate against
     */
    async initialize(techniques: TechniqueModel[]): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        logger.info('Initializing AzureEvalAgent');

        this.techniques = techniques;

        // Initialize local agent
        await this.localAgent.initialize(techniques);

        // Initialize Azure evaluation if configured
        if (this.config.azureOpenAI.useAzureOpenAI &&
            this.config.azureOpenAI.endpoint &&
            (this.config.azureOpenAI.apiKey || this.config.azureOpenAI.useAzureAD)) {
            try {
                this.azureEval = new AzureEval({
                    endpoint: this.config.azureOpenAI.endpoint,
                    apiKey: this.config.azureOpenAI.apiKey,
                    deploymentName: this.config.azureOpenAI.deploymentName,
                    apiVersion: this.config.azureOpenAI.apiVersion,
                    maxTokens: this.config.azureOpenAI.maxTokens,
                    temperature: this.config.azureOpenAI.temperature,
                    timeout: this.config.azureOpenAI.timeout,
                    retryCount: this.config.azureOpenAI.retryCount,
                    useAzureAD: !!this.config.azureOpenAI.useAzureAD
                });

                logger.info('Azure OpenAI evaluation initialized');
            } catch (error) {
                logger.error('Failed to initialize Azure OpenAI evaluation', { error });
                logger.info('Will fall back to local processing');
            }
        } else {
            logger.info('Azure OpenAI not configured, using local processing only');
        }

        this.isInitialized = true;
    }

    /**
     * Evaluate a document against MITRE techniques
     * @param document Document text to evaluate
     * @returns Evaluation result with matches
     */
    async evaluate(document: string): Promise<EvalResult> {
        if (!this.isInitialized) {
            await this.initialize(this.techniques);
        }

        if (!document || document.trim().length === 0) {
            return {
                matches: [],
                summary: {
                    documentId: '',
                    matchCount: 0,
                    topTechniques: [],
                    tacticsCoverage: {},
                    azureOpenAIUsed: false,
                    processingTimeMs: 0
                }
            };
        }

        const startTime = Date.now();

        logger.info(`Evaluating document (length: ${document.length} chars)`);

        try {
            // Try Azure OpenAI if available
            if (this.azureEval && this.config.azureOpenAI.useAzureOpenAI) {
                try {
                    logger.info('Using Azure OpenAI for document evaluation');
                    const result = await this.azureEval.evaluate(document, this.techniques);

                    // Update processing time
                    const processingTime = Date.now() - startTime;
                    result.summary.processingTimeMs = processingTime;

                    logger.info(`Azure OpenAI evaluation complete in ${processingTime}ms with ${result.matches.length} matches`);
                    return result;
                } catch (error) {
                    logger.error('Azure OpenAI evaluation failed, falling back to local processing', { error });
                    // Fall through to local processing
                }
            }

            // Use local processing
            logger.info('Using local processing for document evaluation');
            const result = await this.localAgent.evaluate(document);

            // Update processing time and flag
            const processingTime = Date.now() - startTime;
            result.summary.processingTimeMs = processingTime;
            result.summary.azureOpenAIUsed = false;

            logger.info(`Local evaluation complete in ${processingTime}ms with ${result.matches.length} matches`);
            return result;
        } catch (error: any) {
            logger.error(`Evaluation error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Evaluate a single document chunk
     * @param chunk Document chunk to evaluate
     * @returns Array of matches
     */
    async evaluateChunk(chunk: string): Promise<EvalMatch[]> {
        const result = await this.evaluate(chunk);
        return result.matches;
    }
}
