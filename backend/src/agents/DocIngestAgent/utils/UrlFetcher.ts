import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '../../../utils/Logger';

export interface UrlFetcherConfig {
    userAgent: string;
    timeout: number;
    maxRetries: number;
    followRedirects: boolean;
}

export interface FetchResult {
    content: Buffer;
    contentType: string;
    responseUrl?: string;
    headers: Record<string, string>;
    status: number;
}

/**
 * Utility for fetching content from URLs with retry logic
 */
export class UrlFetcher {
    private config: UrlFetcherConfig;
    private logger: Logger;

    constructor(config: UrlFetcherConfig, logger?: Logger) {
        this.config = {
            ...config
        };
        this.logger = logger || new Logger('UrlFetcher');
    }

    /**
     * Initialize the fetcher
     */
    async initialize(): Promise<void> {
        // Nothing to initialize for now, but keeping the method for consistency
        return Promise.resolve();
    }

    /**
     * Fetch content from a URL with retry logic
     * @param url URL to fetch
     * @returns Fetch result with content and metadata
     */
    async fetch(url: string): Promise<FetchResult> {
        let retries = 0;
        let lastError: Error | null = null;

        while (retries <= this.config.maxRetries) {
            try {
                return await this.doFetch(url);
            } catch (error) {
                lastError = error as Error;

                // If we're out of retries, throw the last error
                if (retries >= this.config.maxRetries) {
                    break;
                }

                // Calculate backoff time using exponential backoff
                const backoff = Math.pow(2, retries) * 1000 + Math.random() * 1000;
                this.logger.warn(`Fetch failed, retrying in ${backoff}ms`, { url, retries, error });

                // Wait for backoff period
                await new Promise(resolve => setTimeout(resolve, backoff));

                // Increment retry counter
                retries++;
            }
        }

        throw new Error(`Failed to fetch URL after ${retries} retries: ${lastError?.message}`);
    }

    /**
     * Perform the actual HTTP request
     * @param url URL to fetch
     * @returns Fetch result
     */
    private async doFetch(url: string): Promise<FetchResult> {
        const requestConfig: AxiosRequestConfig = {
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: this.config.timeout,
            maxRedirects: this.config.followRedirects ? 5 : 0,
            validateStatus: status => status < 400, // Treat only 4xx and 5xx as errors
            headers: {
                'User-Agent': this.config.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        };

        this.logger.info(`Fetching URL: ${url}`);

        try {
            const response: AxiosResponse<Buffer> = await axios(requestConfig);

            // Extract content type from headers
            const contentType = response.headers['content-type'] || 'text/plain';

            // Convert headers to a simple Record
            const headers: Record<string, string> = {};
            Object.entries(response.headers).forEach(([key, value]) => {
                headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
            });

            return {
                content: response.data,
                contentType,
                responseUrl: response.request?.res?.responseUrl || url,
                headers,
                status: response.status
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.logger.error(`Fetch error: ${error.code} - ${error.message}`, { url });
            } else {
                this.logger.error(`Unexpected fetch error`, { url, error });
            }
            throw error;
        }
    }
}
