import logger from './logger';

interface ErrorDetails {
    message: string;
    stack?: string;
    code?: string;
    context?: Record<string, any>;
    user?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
}

class ErrorTracker {
    private static instance: ErrorTracker;
    private errorCount: Record<string, number> = {};
    private lastNotificationTime: Record<string, number> = {};
    private alertThreshold: number = 5; // Errors of same type before alerting
    private alertCooldown: number = 60 * 60 * 1000; // 1 hour cooldown between alerts
    private resetInterval: NodeJS.Timeout;

    private constructor() {
        // Initialize error tracking
        this.resetInterval = setInterval(() => this.resetErrorCounts(), 24 * 60 * 60 * 1000); // Reset counts daily
    }

    public static getInstance(): ErrorTracker {
        if (!ErrorTracker.instance) {
            ErrorTracker.instance = new ErrorTracker();
        }

        return ErrorTracker.instance;
    }

    public trackError(error: Error | string, details: Partial<ErrorDetails> = {}): void {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorStack = typeof error === 'string' ? undefined : error.stack;
        const errorCode = typeof error === 'string' ? undefined : (error as any).code;

        const normalizedDetails: ErrorDetails = {
            message: errorMessage,
            stack: errorStack,
            code: errorCode || details.code,
            context: details.context || {},
            user: details.user,
            severity: details.severity || 'medium',
            tags: details.tags || [],
        };

        // Log the error
        logger.error(errorMessage, {
            error: {
                message: normalizedDetails.message,
                stack: normalizedDetails.stack,
                code: normalizedDetails.code,
            },
            context: normalizedDetails.context,
            user: normalizedDetails.user,
            severity: normalizedDetails.severity,
            tags: normalizedDetails.tags,
        });

        // Generate a key for this error type
        const errorKey = this.getErrorKey(normalizedDetails);

        // Update error count
        this.errorCount[errorKey] = (this.errorCount[errorKey] || 0) + 1;

        // Check if we should send an alert
        this.checkForAlert(errorKey, normalizedDetails);
    }

    private getErrorKey(details: ErrorDetails): string {
        // Create a unique key based on error properties
        return `${details.severity || 'unknown_severity'}-${details.code || 'unknown_code'}-${details.message.substring(0, 50).replace(/\s+/g, '_')}`;
    }

    private checkForAlert(errorKey: string, details: ErrorDetails): void {
        const count = this.errorCount[errorKey] || 0;
        const lastNotification = this.lastNotificationTime[errorKey] || 0;
        const now = Date.now();

        // Check if we've crossed the threshold and cooldown period has passed
        if (count >= this.alertThreshold && (now - lastNotification > this.alertCooldown)) {
            this.sendAlert(details, count);
            this.lastNotificationTime[errorKey] = now;
        }
    }

    private sendAlert(details: ErrorDetails, count: number): void {
        // In a real implementation, this would send to various alert channels
        // For now, we'll just log it prominently
        logger.warn(`ALERT: Error threshold reached (${count} occurrences)`, {
            error: {
                message: details.message,
                code: details.code,
            },
            severity: details.severity,
            count,
            timestamp: new Date().toISOString(),
        });

        // Here you would integrate with notification services like:
        // - Email alerts
        // - Slack/Teams notifications
        // - PagerDuty
        // - SMS alerts
        // etc.
    }

    private resetErrorCounts(): void {
        logger.info('Resetting error counts for alerting.');
        this.errorCount = {};
    }

    public stop(): void {
        clearInterval(this.resetInterval);
    }
}

export const errorTracker = ErrorTracker.getInstance();
