import winston from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transport for all logs with rotation
const allLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'all-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m', // 20 Megabytes
    maxFiles: '14d', // Keep logs for 14 days
    format: logFormat,
});

// Create transport for error logs with rotation
const errorLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m', // 20 Megabytes
    maxFiles: '30d', // Keep error logs for 30 days
    level: 'error',
    format: logFormat,
});

// Create console transport
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
            let logMessage = `${timestamp} ${level}: ${message}`;
            if (stack) {
                logMessage += `\n${stack}`;
            }
            if (Object.keys(meta).length) {
                // Filter out noisy metadata if necessary or format it nicely
                const filteredMeta = Object.entries(meta).reduce((acc, [key, value]) => {
                    if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'stack') {
                        // @ts-ignore
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                if (Object.keys(filteredMeta).length > 0) {
                    logMessage += ` ${JSON.stringify(filteredMeta, null, 2)}`;
                }
            }
            return logMessage;
        })
    ),
});

// Determine log level from environment or default to 'info'
const currentLogLevel = process.env.LOG_LEVEL || 'info';

// Configure logger with all transports
const logger = winston.createLogger({
    level: currentLogLevel,
    levels: { // Ensure standard levels are defined if using custom ones elsewhere
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
    },
    transports: [
        consoleTransport,
        allLogsTransport,
        errorLogsTransport,
    ],
    exitOnError: false, // Do not exit on handled exceptions
});

// Setup log cleanup job for archived files
const setupLogCleanup = () => {
    // Run cleanup daily
    setInterval(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Default retention for .gz files, adjust if needed

        logger.info('Running log cleanup job.');
        fs.readdir(logsDir, (err, files) => {
            if (err) {
                logger.error('Error reading logs directory for cleanup', { error: err.message, path: logsDir });
                return;
            }

            files.forEach(file => {
                // Only target archived (zipped) files for this cleanup logic
                // DailyRotateFile handles its own maxFiles cleanup for unarchived logs
                if (!file.endsWith('.gz')) return;

                const filePath = path.join(logsDir, file);

                fs.stat(filePath, (statErr, stats) => {
                    if (statErr) {
                        logger.error('Error getting file stats during log cleanup', {
                            error: statErr.message,
                            file: filePath,
                        });
                        return;
                    }

                    // Check if file is older than retention period (e.g., 30 days for .gz files)
                    // This example uses 30 days, align with your maxFiles or desired archive retention
                    if (stats.mtime < thirtyDaysAgo) {
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr) {
                                logger.error('Error deleting old log file', {
                                    error: unlinkErr.message,
                                    file: filePath,
                                });
                            } else {
                                logger.info('Deleted old log file', { file: filePath });
                            }
                        });
                    }
                });
            });
        });
    }, 24 * 60 * 60 * 1000); // Run daily
};

// Initialize the cleanup job if needed, or rely on DailyRotateFile's maxFiles
// setupLogCleanup(); // DailyRotateFile handles maxFiles, so this might be redundant unless for .gz specifically with different logic

export default logger;
