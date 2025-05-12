/**
 * URL validation utility
 */
export class UrlValidator {
    /**
     * Validate if a string is a properly formatted URL
     * @param url URL to validate
     * @returns True if URL is valid
     */
    isValidUrl(url: string): boolean {
        try {
            if (!url) return false;

            // Check basic URL format using URL constructor
            const parsedUrl = new URL(url);

            // Must have http or https protocol
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return false;
            }

            // Must have a hostname
            if (!parsedUrl.hostname) {
                return false;
            }

            // Check for invalid characters
            const invalidChars = /[\s<>{}|\\^`]/;
            if (invalidChars.test(url)) {
                return false;
            }

            // Check for common localhost and private IPs which we may want to block
            if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
                return false;
            }

            // Additional security checks could be added here

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if URL is accessible and returns valid content
     * This is a more expensive check than isValidUrl
     * @param url URL to check
     * @returns True if URL is accessible
     */
    async isAccessible(url: string): Promise<boolean> {
        try {
            // This is a placeholder - in a real implementation, you would 
            // make a HEAD request to check if the URL is accessible
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sanitize URL to prevent common issues
     * @param url URL to sanitize
     * @returns Sanitized URL
     */
    sanitizeUrl(url: string): string {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.toString();
        } catch {
            return '';
        }
    }
}
