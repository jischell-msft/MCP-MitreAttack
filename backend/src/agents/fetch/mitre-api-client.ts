import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../../utils/logger';
import { withRetry } from '../../utils';

/**
 * Client for fetching MITRE ATT&CK data
 */
export class MitreApiClient {
    private client: AxiosInstance;
    private timeout: number;
    private maxRetries: number;

    /**
     * Create a new MitreApiClient
     * @param timeout Request timeout in milliseconds
     * @param maxRetries Maximum number of retries for failed requests
     */
    constructor(timeout: number = 30000, maxRetries: number = 3) {
        this.timeout = timeout;
        this.maxRetries = maxRetries;

        // Create axios instance
        this.client = axios.create({
            timeout: this.timeout,
            headers: {
                'User-Agent': 'MitreMcpFetchAgent/1.0',
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Fetch data from a URL with conditional request support
     * @param url URL to fetch data from
     * @param etag Optional ETag for conditional request
     * @param lastModified Optional Last-Modified date for conditional request
     * @returns Response with data and headers
     */
    async fetchData(
        url: string,
        etag?: string,
        lastModified?: string
    ): Promise<{ data: any; headers: Record<string, string>; modified: boolean }> {
        // Configure request options
        const options: AxiosRequestConfig = {
            headers: {}
        };

        // Add conditional headers if provided
        if (etag) {
            options.headers['If-None-Match'] = etag;
        }

        if (lastModified) {
            options.headers['If-Modified-Since'] = lastModified;
        }

        // Make request with retry logic
        return withRetry(
            async () => {
                try {
                    logger.debug(`Fetching MITRE data from ${url}`);
                    const startTime = Date.now();
                    const response = await this.client.get(url, options);
                    const duration = Date.now() - startTime;

                    logger.info(`Successfully fetched MITRE data in ${duration}ms`);

                    return {
                        data: response.data,
                        headers: this.extractHeaders(response),
                        modified: true
                    };
                } catch (error) {
                    // Handle 304 Not Modified specially
                    if (axios.isAxiosError(error) && error.response?.status === 304) {
                        logger.info('MITRE data not modified since last fetch');
                        return {
                            data: null,
                            headers: this.extractHeaders(error.response),
                            modified: false
                        };
                    }

                    // Re-throw for other errors
                    throw error;
                }
            },
            {
                retries: this.maxRetries,
                delay: 1000,
                onError: (error, attempt) => {
                    logger.warn(`Attempt ${attempt} failed to fetch MITRE data: ${error.message}`);
                }
            }
        );
    }

    /**
     * Extract relevant headers from response
     * @param response Axios response
     * @returns Simplified headers object
     */
    private extractHeaders(response: AxiosResponse): Record<string, string> {
        const headers: Record<string, string> = {};

        // Extract ETag (remove quotes if present)
        if (response.headers.etag) {
            headers.etag = response.headers.etag;
        }

        // Extract Last-Modified
        if (response.headers['last-modified']) {
            headers['last-modified'] = response.headers['last-modified'];
        }

        // Extract Content-Type
        if (response.headers['content-type']) {
            headers['content-type'] = response.headers['content-type'];
        }

        return headers;
    }
}
