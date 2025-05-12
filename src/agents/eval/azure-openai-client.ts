import axios from 'axios';
import { logger } from '../../utils/logger';
import { DefaultAzureCredential } from '@azure/identity';
import { OpenAIClient } from '@azure/openai';

/**
 * Configuration for Azure OpenAI client
 */
export interface AzureOpenAIConfig {
    endpoint: string;             // Azure OpenAI service endpoint URL
    apiKey?: string;              // API key for authentication
    deploymentName: string;       // Model deployment name (e.g., "gpt-4")
    apiVersion: string;           // API version (e.g., "2023-05-15")
    maxTokens: number;            // Maximum tokens for completion
    temperature: number;          // Temperature for generation (0.0-1.0)
    timeout: number;              // Request timeout in milliseconds
    retryCount: number;           // Number of retry attempts
    useAzureAD: boolean;          // Whether to use Azure AD authentication
}

/**
 * Client for interacting with Azure OpenAI API
 */
export class AzureOpenAIClient {
    private config: AzureOpenAIConfig;
    private cachedResponses: Map<string, { timestamp: number; result: string }>;
    private circuitBreakerTripped = false;
    private circuitBreakerResetTime = 0;
    private consecutiveFailures = 0;
    private aadClient?: OpenAIClient;

    /**
     * Create a new Azure OpenAI client
     * @param config Client configuration
     */
    constructor(config: AzureOpenAIConfig) {
        this.config = {
            ...config,
            timeout: config.timeout || 60000,
            retryCount: config.retryCount || 3
        };

        this.cachedResponses = new Map();

        if (this.config.useAzureAD) {
            try {
                const credential = new DefaultAzureCredential();
                this.aadClient = new OpenAIClient(
                    this.config.endpoint,
                    credential
                );
            } catch (error) {
                logger.error('Failed to initialize AAD authentication for Azure OpenAI', { error });
                // We'll fall back to API key if AAD fails
            }
        }

        // Validate config
        if (!this.config.useAzureAD && !this.config.apiKey) {
            throw new Error('Missing required Azure OpenAI API key');
        }

        if (!this.config.endpoint) {
            throw new Error('Missing required Azure OpenAI endpoint');
        }

        if (!this.config.deploymentName) {
            throw new Error('Missing required Azure OpenAI deployment name');
        }
    }

    /**
     * Generate a cache key for request
     * @param systemPrompt System prompt
     * @param userPrompt User prompt
     * @returns Cache key string
     */
    private generateCacheKey(systemPrompt: string, userPrompt: string): string {
        return `${systemPrompt}|${userPrompt}`;
    }

    /**
     * Reset circuit breaker if it's time
     */
    private checkCircuitBreaker(): boolean {
        if (!this.circuitBreakerTripped) {
            return true;
        }

        const now = Date.now();
        if (now >= this.circuitBreakerResetTime) {
            logger.info('Resetting Azure OpenAI circuit breaker');
            this.circuitBreakerTripped = false;
            this.consecutiveFailures = 0;
            return true;
        }

        return false;
    }

    /**
     * Trip the circuit breaker
     */
    private tripCircuitBreaker(): void {
        this.circuitBreakerTripped = true;
        // Reset after 5 minutes
        this.circuitBreakerResetTime = Date.now() + 5 * 60 * 1000;
        logger.warn('Azure OpenAI circuit breaker tripped, will reset in 5 minutes');
    }

    /**
     * Get completion from Azure OpenAI with Azure AD authentication
     */
    private async completeWithAAD(systemPrompt: string, userPrompt: string): Promise<string> {
        if (!this.aadClient) {
            throw new Error('AAD client not initialized');
        }

        try {
            const response = await this.aadClient.getChatCompletions(
                this.config.deploymentName,
                [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                {
                    temperature: this.config.temperature,
                    maxTokens: this.config.maxTokens,
                    responseFormat: { type: "json_object" }
                }
            );

            return response.choices[0].message?.content || "";
        } catch (error: any) {
            logger.error("Azure OpenAI API error with AAD auth", {
                error: error.message,
                endpoint: this.config.endpoint
            });

            throw error;
        }
    }

    /**
     * Get completion from Azure OpenAI with API key authentication
     */
    private async completeWithApiKey(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

            const response = await axios.post(url,
                {
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ],
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.config.apiKey
                    },
                    timeout: this.config.timeout
                }
            );

            return response.data.choices[0].message.content;
        } catch (error: any) {
            logger.error("Azure OpenAI API error", {
                error: error.message,
                status: error.response?.status,
                endpoint: this.config.endpoint.replace(/\/+$/, '')
            });

            throw error;
        }
    }

    /**
     * Get a completion from Azure OpenAI with caching, circuit breaking, and retries
     * @param systemPrompt The system prompt
     * @param userPrompt The user prompt
     * @returns The completion text
     */
    async complete(systemPrompt: string, userPrompt: string): Promise<string> {
        // Check for circuit breaker
        if (!this.checkCircuitBreaker()) {
            throw new Error('Azure OpenAI circuit breaker is open');
        }

        // Check cache first
        const cacheKey = this.generateCacheKey(systemPrompt, userPrompt);
        const cachedResult = this.cachedResponses.get(cacheKey);

        if (cachedResult && (Date.now() - cachedResult.timestamp < 24 * 60 * 60 * 1000)) {
            logger.debug('Using cached Azure OpenAI response');
            return cachedResult.result;
        }

        // Try with retries
        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
            if (attempt > 0) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.info(`Retrying Azure OpenAI request (attempt ${attempt}), waiting ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                let result: string;

                if (this.config.useAzureAD && this.aadClient) {
                    result = await this.completeWithAAD(systemPrompt, userPrompt);
                } else {
                    result = await this.completeWithApiKey(systemPrompt, userPrompt);
                }

                // Reset consecutive failures on success
                this.consecutiveFailures = 0;

                // Cache the result
                this.cachedResponses.set(cacheKey, {
                    timestamp: Date.now(),
                    result
                });

                // Clean up old cache entries if cache gets too big
                if (this.cachedResponses.size > 1000) {
                    const oldestEntries = Array.from(this.cachedResponses.entries())
                        .sort((a, b) => a[1].timestamp - b[1].timestamp)
                        .slice(0, 200);

                    for (const [key] of oldestEntries) {
                        this.cachedResponses.delete(key);
                    }
                }

                return result;
            } catch (error: any) {
                lastError = error;
                logger.warn(`Azure OpenAI request failed (attempt ${attempt + 1}/${this.config.retryCount + 1})`, {
                    error: error.message,
                    status: error.response?.status
                });
            }
        }

        // All attempts failed
        this.consecutiveFailures++;

        // Trip circuit breaker after 5 consecutive failures
        if (this.consecutiveFailures >= 5) {
            this.tripCircuitBreaker();
        }

        throw lastError || new Error('Azure OpenAI request failed');
    }
}
