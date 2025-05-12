import winston from 'winston';
import { Request } from 'express';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define log level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// Define color scheme
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Create format for JSON file logs
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

// Define transports
const transports = [
    // Console transport for development
    new winston.transports.Console({
        format: consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
        filename: 'logs/all.log',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
];

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});

// Create request logger format
export const logRequest = (req: Request, responseTime?: number) => {
    const { method, originalUrl, ip, query, body } = req;

    return {
        method,
        url: originalUrl,
        ip,
        query,
        responseTime: responseTime ? `${responseTime}ms` : undefined,
        // Don't log sensitive information from body
        bodySize: body ? JSON.stringify(body).length : 0,
        timestamp: new Date().toISOString(),
    };
};

export default logger;
