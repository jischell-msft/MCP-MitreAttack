import winston from 'winston';
import { Request } from 'express'; // Type import for requestLogger
import { SERVER_CONFIG } from '../config';

/**
 * Logger levels type
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple logger utility
 */
class Logger {
    private level: LogLevel;

    constructor(level: LogLevel = 'info') {
        this.level = level;
    }

    /**
     * Get numeric priority for log level
     */
    private getLevelPriority(level: LogLevel): number {
        const priorities: Record<LogLevel, number> = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        return priorities[level];
    }

    /**
     * Check if a message should be logged based on level
     */
    private shouldLog(messageLevel: LogLevel): boolean {
        return this.getLevelPriority(messageLevel) >= this.getLevelPriority(this.level);
    }

    /**
     * Format log message
     */
    private formatMessage(level: LogLevel, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    /**
     * Debug level log
     */
    debug(message: string, meta?: any): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }

    /**
     * Info level log
     */
    info(message: string, meta?: any): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, meta));
        }
    }

    /**
     * Warn level log
     */
    warn(message: string, meta?: any): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }

    /**
     * Error level log
     */
    error(message: string, meta?: any): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }

    /**
     * Set log level
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }
}

// Create and export a singleton instance
export const logger = new Logger(SERVER_CONFIG.logLevel as LogLevel);

// Winston logger configuration
const transportConsole = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level}] ${message}`;
        })
    )
});

const transportFile = new winston.transports.File({
    filename: 'app.log',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

const loggerWinston = winston.createLogger({
    level: SERVER_CONFIG.logLevel,
    transports: [
        transportConsole,
        transportFile
    ]
});

export { loggerWinston };

// Request logger middleware for Express
export function requestLogger(req: Request, res: any, next: () => void) {
    loggerWinston.info(`HTTP ${req.method} ${req.url}`);
    next();
}
